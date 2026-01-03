import { redirect } from "next/navigation";

export default function Home() {
  // 메인으로 접속하면 바로 'Macintosh HD' 경로로 이동
  redirect("/drive/root"); 
}