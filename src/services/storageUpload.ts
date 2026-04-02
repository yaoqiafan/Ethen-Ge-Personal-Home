// 对象存储上传服务
// 当前：使用 URL.createObjectURL 本地 Mock
// 后续：替换 uploadToS3 / uploadToOSS 实现即可，接口签名不变

export interface UploadResult {
  url: string
  filename: string
  size: number
}

/**
 * 上传图片文件
 * @param file - 要上传的图片 File 对象
 * @returns 可访问的图片 URL
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  // 校验
  if (!file.type.startsWith('image/')) {
    throw new Error('仅支持图片文件（JPG / PNG / WebP / GIF）')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('图片文件不可超过 10MB')
  }

  // Mock：用 createObjectURL 生成本地临时 URL
  // TODO: 替换为真实 S3/OSS 上传逻辑
  await new Promise(resolve => setTimeout(resolve, 600)) // 模拟网络延迟
  const url = URL.createObjectURL(file)

  return {
    url,
    filename: file.name,
    size: file.size,
  }
}

/** 将 File 转为 base64 Data URL（备用方案，适合小图标） */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
