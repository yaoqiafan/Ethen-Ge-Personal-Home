const API = 'https://stoplesslab.com/api/kitchen'

export interface UploadResult {
  url: string
  filename: string
  size: number
}

/** 将 File 转为 base64 Data URL（用于本地预览） */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** 上传图片到服务端，由服务端存入 COS，返回公网 URL */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) throw new Error('仅支持图片文件（JPG / PNG / WebP）')
  if (file.size > 10 * 1024 * 1024) throw new Error('图片不可超过 10MB')

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const res = await fetch(`${API}/dishes/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mimeType: file.type }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.error || `上传失败 (${res.status})`)
  }
  const data = await res.json() as { ok: boolean; url: string }
  return { url: data.url, filename: file.name, size: file.size }
}
