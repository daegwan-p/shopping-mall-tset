const WIDGET_SCRIPT = "https://upload-widget.cloudinary.com/global/all.js";

function loadCloudinaryScript() {
  return new Promise((resolve, reject) => {
    if (window.cloudinary) {
      resolve(window.cloudinary);
      return;
    }

    const existing = document.querySelector(`script[src="${WIDGET_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.cloudinary));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.cloudinary);
    script.onerror = () => reject(new Error("Cloudinary 위젯 스크립트를 불러오지 못했습니다."));
    document.body.appendChild(script);
  });
}

export async function openCloudinaryWidget({ onSuccess, onError } = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    const message =
      "Cloudinary 설정이 없습니다. client/.env에 VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET을 추가하세요.";
    onError?.(new Error(message));
    throw new Error(message);
  }

  const cloudinary = await loadCloudinaryScript();

  return new Promise((resolve, reject) => {
    const widget = cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ["local", "url", "camera"],
        multiple: false,
        maxFiles: 1,
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
        cropping: false,
        folder: "odeum/products",
      },
      (error, result) => {
        if (error) {
          onError?.(error);
          reject(error);
          return;
        }

        if (result?.event === "success") {
          const payload = {
            url: result.info.secure_url,
            publicId: result.info.public_id,
          };
          onSuccess?.(payload);
          resolve(payload);
          widget.close();
        }
      }
    );

    widget.open();
  });
}
