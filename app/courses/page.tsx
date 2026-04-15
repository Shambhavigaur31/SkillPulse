import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CourseRecommendations } from "@/components/dashboard/course-recommendations"

export default function CoursesPage() {
  return (
    <DashboardShell
      title="Courses"
      description="Pick targeted learning resources aligned with your current skill gaps."
    >
      <CourseRecommendations />
    </DashboardShell>
  )
}
