import { ExerciseQuizScreen } from "@/components/learn/exercise-quiz-screen";

export default async function ExerciseLessonPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  return <ExerciseQuizScreen n={Number(n) || 1} />;
}
