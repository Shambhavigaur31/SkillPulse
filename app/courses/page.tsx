import { Suspense } from "react"
import { LearningHubPage } from "@/components/dashboard/learning-hub-page"

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading learning hub...</div>}>
      <LearningHubPage />
    </Suspense>
  )
}
