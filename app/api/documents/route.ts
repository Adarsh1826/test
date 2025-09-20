import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import Document from "@/models/Document"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import cloudinary from "@/lib/cloudinary"

export const runtime = "nodejs"

// ========== UPLOAD ==========
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()

    const formData = await request.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    // Validate file
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) return NextResponse.json({ error: "Only PDF files allowed" }, { status: 400 })
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: "File size must be <10MB" }, { status: 400 })

    // Unique name
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const ext = file.name.split(".").pop()
    const fileName = `${timestamp}_${randomString}.${ext}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let filePath: string
    let fileUrl: string | undefined

    if (process.env.NODE_ENV === "production") {
      // ✅ Upload to Cloudinary
      const result: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "studymate/documents",
            resource_type: "raw",
            public_id: fileName,
          },
          (err, res) => {
            if (err) reject(err)
            else resolve(res)
          }
        )
        stream.end(buffer)
      })

      filePath = result.public_id
      fileUrl = result.secure_url
    } else {
      // ✅ Local dev storage
      const uploadsDir = join(process.cwd(), "public", "uploads", "documents")
      if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true })
      const localPath = join(uploadsDir, fileName)
      await writeFile(localPath, buffer)
      filePath = `/uploads/documents/${fileName}`
    }

    // ✅ Save metadata
    const document = new Document({
      name: file.name.replace(/\.[^/.]+$/, ""),
      originalName: file.name,
      fileName,
      filePath,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      userId: session.user.id,
      status: "processing",
    })
    await document.save()

    // ✅ Parse PDF text
    try {
      const { default: pdfParse } = await import("pdf-parse")
      const parsed = await pdfParse(buffer as any)
      document.extractedText = (parsed?.text || "").trim()
      document.status = "completed"
      document.processedDate = new Date()
      await document.save()

      // Trigger background ingestion
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: String(document._id) }),
      }).catch(() => undefined)
    } catch (err: any) {
      console.error("PDF parse error:", err)
      document.status = "error"
      document.errorMessage = `Failed to extract text: ${err.message || "unknown error"}`
      await document.save()
      return NextResponse.json({ success: false, error: document.errorMessage }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document._id,
        name: document.name,
        originalName: document.originalName,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        uploadDate: document.uploadDate,
        filePath: document.filePath,
        fileUrl: document.fileUrl,
      },
    })
  } catch (err) {
    console.error("Upload error:", err)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}

// ========== UPDATE ==========
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()
    const { id, extractedText, status, ingest } = await request.json()
    if (!id) return NextResponse.json({ error: "Document ID required" }, { status: 400 })

    const update: any = {}
    if (typeof extractedText === "string") update.extractedText = extractedText
    if (typeof status === "string") update.status = status
    if (!Object.keys(update).length) return NextResponse.json({ error: "No updates provided" }, { status: 400 })

    const doc = await Document.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: update },
      { new: true }
    )
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    if (ingest && doc.extractedText?.trim()) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc._id }),
      }).catch(() => undefined)
    }

    return NextResponse.json({ success: true, document: doc })
  } catch (err) {
    console.error("Update error:", err)
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
  }
}

// ========== GET ==========
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()
    const documents = await Document.find({ userId: session.user.id }).sort({ uploadDate: -1 }).lean()
    return NextResponse.json({ documents })
  } catch (err) {
    console.error("Get documents error:", err)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

// ========== DELETE ==========
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectToDatabase()
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("id")
    if (!documentId) return NextResponse.json({ error: "Document ID required" }, { status: 400 })

    const document = await Document.findOneAndDelete({ _id: documentId, userId: session.user.id })
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    // ✅ Delete file
    if (process.env.NODE_ENV === "production" && document.filePath) {
      try {
        await cloudinary.uploader.destroy(document.filePath, { resource_type: "raw" })
      } catch (err) {
        console.error("Cloudinary delete error:", err)
      }
    } else if (document.filePath?.startsWith("/uploads")) {
      const localPath = join(process.cwd(), "public", document.filePath)
      if (existsSync(localPath)) {
        await unlink(localPath)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete error:", err)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
