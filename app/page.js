'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Briefcase, BarChart3, LogOut, Eye, EyeOff, Filter } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import skillsJobsData from '@/data/skills-jobs.json'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [userSkills, setUserSkills] = useState([])
  const [selectedSkills, setSelectedSkills] = useState([])
  const [matchedJobs, setMatchedJobs] = useState([])
  const [jobFilter, setJobFilter] = useState('all')
  const [allUsers, setAllUsers] = useState([])
  const [activeTab, setActiveTab] = useState('jobs')

  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await loadUserData(session.user.id)
      }
      setLoading(false)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadUserData(session.user.id)
        } else {
          setUser(null)
          setUserSkills([])
          setSelectedSkills([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (userSkills.length > 0) {
      findMatchedJobs()
    }
  }, [userSkills, jobFilter])

  const loadUserData = async (userId) => {
    try {
      const response = await fetch('/api/user/skills')
      if (response.ok) {
        const data = await response.json()
        setUserSkills(data.skills || [])
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }

    // Load all users for dashboard
    try {
      const response = await fetch('/api/dashboard/users')
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const findMatchedJobs = () => {
    if (userSkills.length === 0) {
      setMatchedJobs([])
      return
    }

    let filtered = skillsJobsData.jobs.filter(job => {
      const hasMatchingSkill = job.tags.some(tag => userSkills.includes(tag))
      const matchesFilter = jobFilter === 'all' || job.type.toLowerCase().replace('-', '') === jobFilter
      return hasMatchingSkill && matchesFilter
    })

    // Sort by number of matching skills
    filtered.sort((a, b) => {
      const aMatches = a.tags.filter(tag => userSkills.includes(tag)).length
      const bMatches = b.tags.filter(tag => userSkills.includes(tag)).length
      return bMatches - aMatches
    })

    setMatchedJobs(filtered)
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setAuthError('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleSkillSelection = async (skillName) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillName))
    } else if (selectedSkills.length < 3) {
      setSelectedSkills([...selectedSkills, skillName])
    }
  }

  const saveUserSkills = async () => {
    try {
      const response = await fetch('/api/user/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skills: selectedSkills }),
      })

      if (response.ok) {
        setUserSkills(selectedSkills)
        setActiveTab('jobs')
      }
    } catch (error) {
      console.error('Error saving skills:', error)
    }
  }

  const handleApply = (jobTitle) => {
    alert(`Apply for ${jobTitle}!`)
  }

  const getSkillFrequencyData = () => {
    const skillCounts = {}
    skillsJobsData.skills.forEach(skill => {
      skillCounts[skill.name] = allUsers.filter(user => 
        user.skills && user.skills.includes(skill.name)
      ).length
    })

    return {
      labels: Object.keys(skillCounts),
      datasets: [{
        label: 'Number of Users',
        data: Object.values(skillCounts),
        backgroundColor: [
          'rgba(168, 85, 247, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderRadius: 8,
      }]
    }
  }

  const getJobDemandData = () => {
    const categoryCounts = {}
    skillsJobsData.jobs.forEach(job => {
      categoryCounts[job.category] = (categoryCounts[job.category] || 0) + 1
    })

    return {
      labels: Object.keys(categoryCounts),
      datasets: [{
        label: 'Number of Jobs',
        data: Object.values(categoryCounts),
        backgroundColor: [
          'rgba(168, 85, 247, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderRadius: 8,
      }]
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">WorkWise</CardTitle>
            <CardDescription className="text-lg text-purple-600 font-medium">
              Where Skills Meet Jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white/50 border-purple-200 focus:border-purple-500 rounded-xl"
                />
              </div>
              <div className="space-y-2 relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white/50 border-purple-200 focus:border-purple-500 rounded-xl pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {authError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  {authError}
                </p>
              )}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg" 
                disabled={authLoading}
              >
                {authLoading ? 'Loading...' : authMode === 'signup' ? 'Sign Up' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-center">
            <Button
              variant="link"
              onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
              className="text-purple-600 hover:text-purple-800"
            >
              {authMode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WorkWise</h1>
              <p className="text-sm text-purple-600 font-medium">Where Skills Meet Jobs</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">{user?.email}</span>
              </div>
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                size="sm"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {userSkills.length === 0 ? (
          <Card className="max-w-2xl mx-auto shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Select Your Skills</CardTitle>
              <CardDescription className="text-base">
                Choose up to 3 skills that match your expertise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {skillsJobsData.skills.map((skill) => (
                  <Button
                    key={skill.id}
                    variant={selectedSkills.includes(skill.name) ? "default" : "outline"}
                    className={`h-16 ${
                      selectedSkills.includes(skill.name)
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'border-purple-200 text-gray-700 hover:bg-purple-50'
                    } rounded-xl font-medium`}
                    onClick={() => handleSkillSelection(skill.name)}
                    disabled={!selectedSkills.includes(skill.name) && selectedSkills.length >= 3}
                  >
                    {skill.name}
                  </Button>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={saveUserSkills} 
                disabled={selectedSkills.length === 0}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg"
              >
                Save Skills & Continue
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/80 rounded-xl shadow-lg">
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Job Matching
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Matched Jobs</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {userSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-purple-100 text-purple-700">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="parttime">Part-Time</SelectItem>
                      <SelectItem value="onetime">One-Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matchedJobs.map((job) => (
                  <Card key={job.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <Badge 
                          variant="outline" 
                          className={`${
                            job.type === 'Permanent' ? 'border-green-200 text-green-700 bg-green-50' :
                            job.type === 'Part-Time' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                            'border-orange-200 text-orange-700 bg-orange-50'
                          }`}
                        >
                          {job.type}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {job.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {job.tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant={userSkills.includes(tag) ? "default" : "secondary"}
                            className={`text-xs ${
                              userSkills.includes(tag) 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => handleApply(job.title)}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-md"
                      >
                        Apply Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {matchedJobs.length === 0 && (
                <Card className="text-center py-12 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent>
                    <p className="text-gray-600 text-lg">No jobs match your current skills and filters.</p>
                    <p className="text-gray-500 mt-2">Try adjusting the job type filter above.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-900 text-center">Demand-Supply Dashboard</h2>
              
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-center">Skill Frequency</CardTitle>
                    <CardDescription className="text-center">Number of users with each skill</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Bar data={getSkillFrequencyData()} options={chartOptions} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-center">Job Demand</CardTitle>
                    <CardDescription className="text-center">Number of jobs per category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Bar data={getJobDemandData()} options={chartOptions} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}