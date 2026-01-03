import { FileNode } from '@/types/file';
import { Folder, FileText, Image as ImageIcon, File, Music, Video } from 'lucide-react';

interface FileIconProps {
  file: FileNode;
  size?: number;
}

export default function FileIcon({ file, size = 48 }: FileIconProps) {
  // 폴더인 경우
  if (file.type === 'folder') {
    return <Folder size={size} className="text-blue-400 fill-blue-400/20" strokeWidth={1.5} />;
  }

  // 파일 확장자/MIME에 따른 아이콘 분기
  const name = file.name.toLowerCase();
  
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return <ImageIcon size={size} className="text-purple-500" strokeWidth={1.5} />;
  }
  if (name.endsWith('.mp4') || name.endsWith('.mov')) {
    return <Video size={size} className="text-blue-500" strokeWidth={1.5} />;
  }
  if (name.endsWith('.mp3') || name.endsWith('.wav')) {
    return <Music size={size} className="text-red-500" strokeWidth={1.5} />;
  }
  if (name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.md')) {
    return <FileText size={size} className="text-gray-500" strokeWidth={1.5} />;
  }

  // 기본 아이콘
  return <File size={size} className="text-gray-400" strokeWidth={1.5} />;
}