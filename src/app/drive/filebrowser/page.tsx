'use client';

export default function FileBrowserPage() {
  return (
    <div className="-m-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)]">
      <iframe
        src="/filebrowser/"
        className="w-full h-full border-0"
        title="File Browser"
      />
    </div>
  );
}
