import { FileNode } from "@/types/file";

// 샘플 이미지 URL (Unsplash)
const SAMPLE_IMAGES = {
  banner: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
  travel: 'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=1200',
  family: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=1200',
  logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800',
  mistake: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800',
};

// 샘플 비디오 URL
const SAMPLE_VIDEOS = {
  demo: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
};

export const MOCK_FILES: FileNode[] = [
  // --- Root Folders ---
  { id: 'folder-work', parentId: 'root', name: 'Work Projects', type: 'folder', size: 0, createdAt: new Date('2025-12-01'), updatedAt: new Date('2025-12-20') },
  { id: 'folder-photos', parentId: 'root', name: 'Personal Photos', type: 'folder', size: 0, createdAt: new Date('2025-11-15'), updatedAt: new Date('2025-12-25') },
  { id: 'folder-finance', parentId: 'root', name: 'Finance', type: 'folder', size: 0, createdAt: new Date('2025-10-01'), updatedAt: new Date('2025-12-01') },
  { id: 'folder-videos', parentId: 'root', name: 'Videos', type: 'folder', size: 0, createdAt: new Date('2025-11-01'), updatedAt: new Date('2025-12-28') },

  // --- Root Files ---
  { id: 'file-resume', parentId: 'root', name: 'Resume_2026.pdf', type: 'file', size: 1024 * 450, mimeType: 'application/pdf', createdAt: new Date('2025-12-01'), updatedAt: new Date('2025-12-15') },
  { id: 'file-budget', parentId: 'root', name: 'Budget_Plan.xlsx', type: 'file', size: 1024 * 20, mimeType: 'application/xlsx', createdAt: new Date('2025-11-20'), updatedAt: new Date('2025-12-10') },

  // --- [Level 2] Inside 'Work Projects' (folder-work) ---
  { id: 'work-design', parentId: 'folder-work', name: 'Design Assets', type: 'folder', size: 0, createdAt: new Date('2025-12-05'), updatedAt: new Date('2025-12-18') },
  { id: 'work-doc1', parentId: 'folder-work', name: 'Project_Proposal.docx', type: 'file', size: 1024 * 500, mimeType: 'application/word', createdAt: new Date('2025-12-10'), updatedAt: new Date('2025-12-12') },
  { id: 'work-img1', parentId: 'folder-work', name: 'main_banner.png', type: 'file', size: 1024 * 2000, mimeType: 'image/png', createdAt: new Date('2025-12-08'), updatedAt: new Date('2025-12-08'), url: SAMPLE_IMAGES.banner, thumbnailUrl: SAMPLE_IMAGES.banner },

  // --- [Level 3] Inside 'Design Assets' (work-design) ---
  { id: 'design-logo', parentId: 'work-design', name: 'Logo_Final.svg', type: 'file', size: 1024 * 50, mimeType: 'image/svg+xml', createdAt: new Date('2025-12-15'), updatedAt: new Date('2025-12-15'), url: SAMPLE_IMAGES.logo, thumbnailUrl: SAMPLE_IMAGES.logo },
  { id: 'design-draft', parentId: 'work-design', name: 'Draft_v1.fig', type: 'file', size: 1024 * 10000, mimeType: 'application/figma', createdAt: new Date('2025-12-14'), updatedAt: new Date('2025-12-16') },

  // --- [Level 2] Inside 'Personal Photos' (folder-photos) ---
  { id: 'photo-1', parentId: 'folder-photos', name: 'Travel_Jeju.jpg', type: 'file', size: 1024 * 5000, mimeType: 'image/jpeg', createdAt: new Date('2025-12-20'), updatedAt: new Date('2025-12-20'), url: SAMPLE_IMAGES.travel, thumbnailUrl: SAMPLE_IMAGES.travel },
  { id: 'photo-2', parentId: 'folder-photos', name: 'Family_Dinner.jpg', type: 'file', size: 1024 * 4200, mimeType: 'image/jpeg', createdAt: new Date('2025-12-24'), updatedAt: new Date('2025-12-24'), url: SAMPLE_IMAGES.family, thumbnailUrl: SAMPLE_IMAGES.family },

  // --- [Level 2] Inside 'Videos' (folder-videos) ---
  { id: 'video-1', parentId: 'folder-videos', name: 'Demo_Video.mp4', type: 'file', size: 1024 * 1024 * 150, mimeType: 'video/mp4', createdAt: new Date('2025-12-26'), updatedAt: new Date('2025-12-26'), url: SAMPLE_VIDEOS.demo },
  { id: 'video-2', parentId: 'folder-videos', name: 'Screen_Recording.mov', type: 'file', size: 1024 * 1024 * 80, mimeType: 'video/quicktime', createdAt: new Date('2025-12-27'), updatedAt: new Date('2025-12-27') },

  // --- Trash Files (휴지통 예시) ---
  { id: 'trash-1', parentId: 'root', name: 'Old_Draft_v0.txt', type: 'file', size: 1024, mimeType: 'text/plain', createdAt: new Date('2025-11-01'), updatedAt: new Date('2025-11-15'), isTrashed: true, trashedAt: new Date('2025-12-01') },
  { id: 'trash-2', parentId: 'folder-work', name: 'Mistake.png', type: 'file', size: 1024 * 500, mimeType: 'image/png', createdAt: new Date('2025-12-05'), updatedAt: new Date('2025-12-05'), isTrashed: true, trashedAt: new Date('2025-12-10'), url: SAMPLE_IMAGES.mistake, thumbnailUrl: SAMPLE_IMAGES.mistake },
];