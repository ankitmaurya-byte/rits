import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER ?? "rits";

function ensureCloudinaryConfig() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    ensureCloudinaryConfig();
    const cloudName = CLOUDINARY_CLOUD_NAME!;
    const apiKey = CLOUDINARY_API_KEY!;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `${CLOUDINARY_FOLDER}/editor`;
    const signatureBase = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = createHash("sha1").update(signatureBase).digest("hex");

    const cloudinaryData = new FormData();
    cloudinaryData.append("file", file);
    cloudinaryData.append("api_key", apiKey);
    cloudinaryData.append("timestamp", String(timestamp));
    cloudinaryData.append("signature", signature);
    cloudinaryData.append("folder", folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: cloudinaryData,
    });

    const data = (await response.json()) as {
      secure_url?: string;
      width?: number;
      height?: number;
      error?: { message?: string };
    };

    if (!response.ok || !data.secure_url) {
      throw new Error(data.error?.message ?? "Cloudinary upload failed.");
    }

    return NextResponse.json({
      url: data.secure_url,
      width: data.width ?? null,
      height: data.height ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
