"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExternalLink, Play, BookOpen, GraduationCap, Clock, Star, Filter } from "lucide-react"
import { courseRecommendations, type CourseRecommendation } from "@/lib/data"

const platformIcons: Record<string, React.ReactNode> = {
  youtube: <Play className="h-4 w-4" />,
  coursera: <GraduationCap className="h-4 w-4" />,
  nptel: <BookOpen className="h-4 w-4" />,
  udemy: <Play className="h-4 w-4" />,
  mit_ocw: <GraduationCap className="h-4 w-4" />,
}

const platformColors: Record<string, string> = {
  youtube: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  coursera: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  nptel: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  udemy: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  mit_ocw: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-success/10 text-success border-success/20",
  intermediate: "bg-warning/10 text-warning border-warning/20",
  advanced: "bg-danger/10 text-danger border-danger/20",
}

function CourseCard({ course }: { course: CourseRecommendation }) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 ${
        isHovered ? "shadow-lg scale-[1.02]" : "shadow-sm"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
        course.platform === "youtube" ? "bg-gradient-to-br from-red-500/5 to-transparent" :
        course.platform === "coursera" ? "bg-gradient-to-br from-blue-500/5 to-transparent" :
        course.platform === "nptel" ? "bg-gradient-to-br from-amber-500/5 to-transparent" :
        course.platform === "udemy" ? "bg-gradient-to-br from-purple-500/5 to-transparent" :
        "bg-gradient-to-br from-emerald-500/5 to-transparent"
      }`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md border ${platformColors[course.platform]}`}>
              {platformIcons[course.platform]}
            </div>
            <Badge variant="outline" className="text-xs capitalize">
              {course.platform.replace("_", " ")}
            </Badge>
          </div>
          <Badge variant="outline" className={`text-xs ${difficultyColors[course.difficulty]}`}>
            {course.difficulty}
          </Badge>
        </div>
        <CardTitle className="text-base mt-3 line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm">
          {course.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {course.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {course.skills.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{course.skills.length - 3}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{course.rating.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground/70">{course.instructor}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${
            course.isFree ? "text-success" : "text-muted-foreground"
          }`}>
            {course.isFree ? "Free" : course.price}
          </span>
          <Button 
            size="sm" 
            variant="outline"
            className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            asChild
          >
            <a href={course.url} target="_blank" rel="noopener noreferrer">
              <span>View Course</span>
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function CourseRecommendations() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [selectedSkill, setSelectedSkill] = useState<string>("all")
  
  const allSkills = Array.from(new Set(courseRecommendations.flatMap(c => c.skills)))
  
  const filteredCourses = courseRecommendations.filter(course => {
    if (selectedPlatform !== "all" && course.platform !== selectedPlatform) return false
    if (selectedDifficulty !== "all" && course.difficulty !== selectedDifficulty) return false
    if (selectedSkill !== "all" && !course.skills.includes(selectedSkill)) return false
    return true
  })
  
  const youtubeCourses = filteredCourses.filter(c => c.platform === "youtube")
  const courseraCourses = filteredCourses.filter(c => c.platform === "coursera")
  const nptelCourses = filteredCourses.filter(c => c.platform === "nptel")
  const otherCourses = filteredCourses.filter(c => !["youtube", "coursera", "nptel"].includes(c.platform))
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Recommended Learning Resources
            </CardTitle>
            <CardDescription className="mt-1">
              Personalized courses based on your skill decay patterns
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>
            
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="coursera">Coursera</SelectItem>
                <SelectItem value="nptel">NPTEL</SelectItem>
                <SelectItem value="udemy">Udemy</SelectItem>
                <SelectItem value="mit_ocw">MIT OCW</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSkill} onValueChange={setSelectedSkill}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {allSkills.map(skill => (
                  <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="text-xs">
              All ({filteredCourses.length})
            </TabsTrigger>
            <TabsTrigger value="youtube" className="text-xs">
              YouTube ({youtubeCourses.length})
            </TabsTrigger>
            <TabsTrigger value="coursera" className="text-xs">
              Coursera ({courseraCourses.length})
            </TabsTrigger>
            <TabsTrigger value="nptel" className="text-xs">
              NPTEL ({nptelCourses.length})
            </TabsTrigger>
            <TabsTrigger value="other" className="text-xs">
              Other ({otherCourses.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="youtube" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {youtubeCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="coursera" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {courseraCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="nptel" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {nptelCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="other" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {otherCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        {filteredCourses.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No courses match your filters</p>
            <Button 
              variant="link" 
              onClick={() => {
                setSelectedPlatform("all")
                setSelectedDifficulty("all")
                setSelectedSkill("all")
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
