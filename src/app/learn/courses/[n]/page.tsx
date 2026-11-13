import { CourseWatchScreen } from "@/components/learn/course-watch-screen";

export default async function CourseLessonPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  return <CourseWatchScreen n={Number(n) || 1} />;
}
