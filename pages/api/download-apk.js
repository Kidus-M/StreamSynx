import { createReadStream, statSync } from "fs";
import path from "path";

const APKS = {
  tv: {
    fileName: "StreamSynx-TV.apk",
    downloadName: "StreamSynx-TV.apk",
  },
  android: {
    fileName: "StreamSynx.apk",
    downloadName: "StreamSynx.apk",
  },
};

export default function handler(req, res) {
  const type = String(req.query.type || "").toLowerCase();
  const apk = APKS[type];

  if (!apk) {
    res.status(404).json({ error: "APK not found" });
    return;
  }

  const apkPath = path.join(process.cwd(), "public", "downloads", apk.fileName);

  try {
    const { size } = statSync(apkPath);

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${apk.downloadName}"`);
    res.setHeader("Content-Length", size);
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method === "HEAD") {
      res.status(200).end();
      return;
    }

    createReadStream(apkPath).pipe(res);
  } catch (error) {
    res.status(404).json({ error: "APK file is missing" });
  }
}