// src/services/storageUpload.ts
import COS from 'cos-js-sdk-v5';

// ── COS 基础配置 ──────────────────────────────────────────────────────────────
// 建议这些值通过环境变量管理，避免密钥泄露
const SECRET_ID = import.meta.env.VITE_COS_SECRET_ID || '';
const SECRET_KEY = import.meta.env.VITE_COS_SECRET_KEY || '';
const BUCKET = import.meta.env.VITE_COS_BUCKET || ''; // 格式：examplebucket-1250000000
const REGION = import.meta.env.VITE_COS_REGION || ''; // 例如：ap-shanghai

// 初始化 COS 实例
const cos = new COS({
  SecretId: SECRET_ID,
  SecretKey: SECRET_KEY,
});

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

/**
 * 上传图片文件到腾讯云 COS
 * @param file - 要上传的图片 File 对象
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  // 0. 检查环境变量是否已配置
  if (!SECRET_ID || !SECRET_KEY || !BUCKET || !REGION) {
    const missing = [
      !SECRET_ID  && 'VITE_COS_SECRET_ID',
      !SECRET_KEY && 'VITE_COS_SECRET_KEY',
      !BUCKET     && 'VITE_COS_BUCKET',
      !REGION     && 'VITE_COS_REGION',
    ].filter(Boolean).join(', ')
    throw new Error(`COS 未配置，请在 .env.local 中设置：${missing}`)
  }

  // 1. 基础校验（保留你原有的逻辑）
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件（JPG / PNG / WebP / GIF）');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('图片文件不可超过 10MB');
  }

  // 2. 生成唯一的文件名（防止同名覆盖）
  // 建议路径：kitchen/YYYYMMDD/timestamp-name
  const timestamp = Date.now();
  const cleanFileName = file.name.replace(/\s+/g, '_'); // 处理空格
  const key = `kitchen/dishes/${timestamp}-${cleanFileName}`;

  return new Promise((resolve, reject) => {
    cos.uploadFile({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
      Body: file, // 浏览器环境下直接传 File 对象即可
      onProgress: (progressData) => {
        // 如果需要，可以在这里通过 mitt 或 pinia 更新全局进度条
        const percent = Math.floor(progressData.percent * 100);
        console.log(`[COS] 上传进度: ${percent}%`);
      }
    }, (err, data) => {
      if (err) {
        console.error('COS 上传失败:', err);
        return reject(new Error(`上传失败: ${err.message || '网络异常'}`));
      }

      // 3. 返回符合接口签名的结果
      // data.Location 返回的是不带协议的 URL (例如：example-125...cos.ap-shanghai.myqcloud.com/path)
      // 我们统一补全 https 协议
      const finalUrl = data.Location.startsWith('http')
        ? data.Location
        : `https://${data.Location}`;

      console.log('COS最终图片链接:', finalUrl);

      resolve({
        url: finalUrl,
        filename: file.name,
        size: file.size,
      });
    });
  });
}

/** 将 File 转为 base64 Data URL（备用方案） */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}