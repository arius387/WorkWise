import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Supabase server client
function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    }
  )
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// Authentication helper
async function getAuthenticatedUser() {
  const supabase = createSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Unauthorized - Please log in')
  }
  
  return user
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint - GET /api/
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "WorkWise API - Where Skills Meet Jobs" }))
    }

    // Authentication endpoints
    if (route === '/auth/signup' && method === 'POST') {
      const body = await request.json()
      const supabase = createSupabaseServer()
      
      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
      })
      
      if (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
      }
      
      return handleCORS(NextResponse.json({ user: data.user }))
    }

    if (route === '/auth/signin' && method === 'POST') {
      const body = await request.json()
      const supabase = createSupabaseServer()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      })
      
      if (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
      }
      
      return handleCORS(NextResponse.json({ user: data.user, session: data.session }))
    }

    if (route === '/auth/signout' && method === 'POST') {
      const supabase = createSupabaseServer()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
      }
      
      return handleCORS(NextResponse.json({ message: 'Signed out successfully' }))
    }

    if (route === '/auth/user' && method === 'GET') {
      try {
        const user = await getAuthenticatedUser()
        return handleCORS(NextResponse.json({ user }))
      } catch (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 401 }))
      }
    }

    // User skills endpoints
    if (route === '/user/skills' && method === 'GET') {
      try {
        const user = await getAuthenticatedUser()
        
        const userSkills = await db.collection('user_skills')
          .findOne({ userId: user.id })
        
        return handleCORS(NextResponse.json({ 
          skills: userSkills?.skills || [] 
        }))
      } catch (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 401 }))
      }
    }

    if (route === '/user/skills' && method === 'POST') {
      try {
        const user = await getAuthenticatedUser()
        const body = await request.json()
        
        if (!body.skills || !Array.isArray(body.skills)) {
          return handleCORS(NextResponse.json(
            { error: "Skills array is required" }, 
            { status: 400 }
          ))
        }

        const userSkillsDoc = {
          userId: user.id,
          userEmail: user.email,
          skills: body.skills,
          updatedAt: new Date(),
        }

        await db.collection('user_skills')
          .replaceOne(
            { userId: user.id },
            userSkillsDoc,
            { upsert: true }
          )

        return handleCORS(NextResponse.json({ 
          message: 'Skills updated successfully',
          skills: body.skills 
        }))
      } catch (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 401 }))
      }
    }

    // Dashboard endpoints
    if (route === '/dashboard/users' && method === 'GET') {
      try {
        const user = await getAuthenticatedUser()
        
        const users = await db.collection('user_skills')
          .find({})
          .toArray()
        
        // Remove MongoDB's _id field and return clean data
        const cleanedUsers = users.map(({ _id, ...rest }) => rest)
        
        return handleCORS(NextResponse.json({ users: cleanedUsers }))
      } catch (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 401 }))
      }
    }

    // Job matching endpoint (optional - data is static but could be enhanced)
    if (route === '/jobs/match' && method === 'POST') {
      try {
        const user = await getAuthenticatedUser()
        const body = await request.json()
        
        // This is a placeholder for enhanced job matching logic
        // Currently using static data in frontend, but could be enhanced here
        
        return handleCORS(NextResponse.json({ 
          message: 'Job matching logic placeholder',
          userSkills: body.skills 
        }))
      } catch (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 401 }))
      }
    }

    // Legacy status endpoints for compatibility
    if (route === '/status' && method === 'POST') {
      const body = await request.json()
      
      if (!body.client_name) {
        return handleCORS(NextResponse.json(
          { error: "client_name is required" }, 
          { status: 400 }
        ))
      }

      const statusObj = {
        id: uuidv4(),
        client_name: body.client_name,
        timestamp: new Date()
      }

      await db.collection('status_checks').insertOne(statusObj)
      return handleCORS(NextResponse.json(statusObj))
    }

    if (route === '/status' && method === 'GET') {
      const statusChecks = await db.collection('status_checks')
        .find({})
        .limit(1000)
        .toArray()

      const cleanedStatusChecks = statusChecks.map(({ _id, ...rest }) => rest)
      
      return handleCORS(NextResponse.json(cleanedStatusChecks))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute