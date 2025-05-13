// @ts-nocheck
import dotenv from "dotenv"
import mongoose from "mongoose"
import { Permission, Role, User, Settings, Inquiry } from "@/models"
import logger from "@/utils/logger"

// Load env vars
dotenv.config()

// Connect to DB
mongoose.connect(process.env.MONGODB_URI as string)

// Resources in the system
const resources = [
  "blogs",
  "careers",
  "applications",
  "users",
  "contacts",
  "settings",
  "roles",
  "permissions",
  "inquiries",
  "dashboard", // Added dashboard as a resource
]

// Actions that can be performed
const actions = [
  "create",
  "read",
  "update",
  "delete",
  "manage", // Special permission that includes all CRUD
  "approve",
  "publish",
  "assign", // For assigning inquiries to users
  "view",   // Added view action specifically for dashboard
]

// Roles with their descriptions
const roles = [
  {
    name: "SuperAdmin",
    description: "Has complete access to all resources and actions",
    permissions: [], // Will be filled with all permissions
  },
  {
    name: "Admin",
    description: "Has access to most resources but not system-critical operations",
    permissions: [], // Will be filled with specific permissions
  },
  {
    name: "ContentManager",
    description: "Manages content like blogs and career postings",
    permissions: [], // Will be filled with content-related permissions
  },
  {
    name: "HRManager",
    description: "Manages job applications and career section",
    permissions: [], // Will be filled with HR-related permissions
  },
  {
    name: "BusinessDeveloper",
    description: "Manages inquiries and business development",
    permissions: [], // Will be filled with inquiry-related permissions
  },
  {
    name: "Editor",
    description: "Can edit content but not publish or delete",
    permissions: [], // Will be filled with edit permissions
  },
  {
    name: "Viewer",
    description: "Can only view content, no edit permissions",
    permissions: [], // Will be filled with read permissions
  },
  {
    name: "User",
    description: "Regular authenticated user with minimal permissions",
    permissions: [], // Will be filled with basic permissions
    isDefault: true,
  },
]

// Default email settings
const defaultEmailSettings = {
  notificationEmails: ["admin@example.com"],
  fromEmail: "noreply@youragency.com",
  fromName: "Your Agency Name",
  smtpHost: process.env.SMTP_HOST || "smtp.example.com",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || "smtp_username",
  smtpPassword: process.env.SMTP_PASSWORD || "smtp_password",
  smtpSecure: process.env.SMTP_SECURE === "true" || false,
}

// Sample inquiries for testing
const sampleInquiries = [
  {
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+1234567890",
    subject: "Website Development Inquiry",
    message:
      "Hello, I'm interested in your web development services. Could you please provide more information about your packages and pricing? Thank you.",
    status: "new",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  },
  {
    name: "Jane Doe",
    email: "jane.doe@example.com",
    phone: "+9876543210",
    subject: "Marketing Services",
    message:
      "I would like to discuss your marketing services for my new startup. Please contact me at your earliest convenience.",
    status: "in-process",
    notes: "Called back on June 23, scheduled meeting for next week",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
  },
  {
    name: "Robert Johnson",
    email: "robert.johnson@example.com",
    subject: "SEO Consultation",
    message: "I need help improving my website's search engine rankings. What SEO services do you offer?",
    status: "closed",
    notes: "Client signed up for our monthly SEO package",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  },
]

// Sample users for each role
const sampleUsers = [
  {
    name: "Super Admin",
    email: "admin@example.com",
    password: "password123",
    role: "SuperAdmin",
  },
  {
    name: "Admin User",
    email: "admin-user@example.com",
    password: "password123",
    role: "Admin",
  },
  {
    name: "Content Manager",
    email: "content@example.com",
    password: "password123",
    role: "ContentManager",
  },
  {
    name: "HR Manager",
    email: "hr@example.com",
    password: "password123",
    role: "HRManager",
  },
  {
    name: "Business Developer",
    email: "bizdev@example.com",
    password: "password123",
    role: "BusinessDeveloper",
  },
  {
    name: "Editor",
    email: "editor@example.com",
    password: "password123",
    role: "Editor",
  },
  {
    name: "Viewer",
    email: "viewer@example.com",
    password: "password123",
    role: "Viewer",
  },
  {
    name: "Regular User",
    email: "user@example.com",
    password: "password123",
    role: "User",
  },
]

// Import all data
const importData = async () => {
  try {
    // Clear existing data
    await Permission.deleteMany()
    await Role.deleteMany()
    await User.deleteMany()
    await Settings.deleteMany()

    // Only clear inquiries if explicitly set to true
    const clearInquiries = process.env.CLEAR_INQUIRIES === "true"
    if (clearInquiries) {
      await Inquiry.deleteMany()
    }

    logger.info("Cleared existing data")

    // Create all permissions
    const permissionPromises = []

    for (const resource of resources) {
      for (const action of actions) {
        // Skip certain action/resource combinations that don't make sense
        if (
          (resource === "settings" && ["create", "delete"].includes(action)) ||
          (resource === "permissions" && ["create", "delete"].includes(action)) ||
          (resource === "applications" && action === "publish") ||
          (resource === "contacts" && ["publish", "approve"].includes(action)) ||
          (resource === "users" && ["publish", "approve"].includes(action)) ||
          (resource === "roles" && ["publish", "approve"].includes(action)) ||
          (resource === "permissions" && ["publish", "approve"].includes(action)) ||
          (resource === "settings" && ["publish", "approve"].includes(action)) ||
          // Dashboard specific restrictions
          (resource === "dashboard" && ["create", "update", "delete", "publish", "approve", "assign"].includes(action))
        ) {
          continue
        }

        permissionPromises.push(
          Permission.create({
            name: action,
            resource,
            description: `Allows ${action} operations on ${resource}`,
          }),
        )
      }
    }

    // Add special 'all' resource permission for SuperAdmin
    permissionPromises.push(
      Permission.create({
        name: "manage",
        resource: "all",
        description: "Allows complete access to all resources",
      }),
    )

    const permissions = await Promise.all(permissionPromises)
    logger.info(`${permissions.length} permissions created`)

    // Map permissions by their code for easy lookup
    const permissionMap = permissions.reduce(
      (map, permission) => {
        const code = `${permission.resource}:${permission.name}`
        map[code] = permission._id
        return map
      },
      {} as Record<string, mongoose.Types.ObjectId>,
    )

    // Helper function to add permissions to a role
    const addPermissionsToRole = (roleName, permissionCodes) => {
      const role = roles.find((r) => r.name === roleName)
      if (!role) return

      permissionCodes.forEach((code) => {
        if (permissionMap[code]) {
          role.permissions.push(permissionMap[code])
        }
      })
    }

    // SuperAdmin gets all permissions
    roles.find((r) => r.name === "SuperAdmin").permissions = permissions.map((p) => p._id)

    // Admin gets everything except critical system operations
    addPermissionsToRole("Admin", [
      // User management
      "users:read",
      "users:create",
      "users:update",
      "users:delete",
      "users:manage",

      // Content management
      "blogs:read",
      "blogs:create",
      "blogs:update",
      "blogs:delete",
      "blogs:publish",
      "blogs:manage",
      "careers:read",
      "careers:create",
      "careers:update",
      "careers:delete",
      "careers:publish",
      "careers:manage",
      "applications:read",
      "applications:update",
      "applications:delete",
      "applications:approve",
      "applications:manage",

      // Inquiries
      "inquiries:read",
      "inquiries:create",
      "inquiries:update",
      "inquiries:delete",
      "inquiries:assign",
      "inquiries:manage",

      // Settings
      "settings:read",
      "settings:update",
      "settings:manage",

      // Limited role/permission management
      "roles:read",
      "permissions:read",
      
      // Dashboard access
      "dashboard:view",
      "dashboard:read",
      "dashboard:manage",
    ])

    // ContentManager permissions
    addPermissionsToRole("ContentManager", [
      // Content management
      "blogs:read",
      "blogs:create",
      "blogs:update",
      "blogs:delete",
      "blogs:publish",
      "careers:read",
      "careers:create",
      "careers:update",
      "careers:delete",
      "careers:publish",

      // Limited access
      "applications:read",
      "inquiries:read",
      "users:read",
      
      // Dashboard access (limited)
      "dashboard:view",
      "dashboard:read",
    ])

    // HRManager permissions
    addPermissionsToRole("HRManager", [
      // Career and application management
      "careers:read",
      "careers:create",
      "careers:update",
      "careers:delete",
      "careers:publish",
      "applications:read",
      "applications:create",
      "applications:update",
      "applications:delete",
      "applications:approve",
      "applications:manage",

      // Limited access
      "users:read",
      "inquiries:read",
      
      // Dashboard access (limited)
      "dashboard:view",
      "dashboard:read",
    ])

    // BusinessDeveloper permissions
    addPermissionsToRole("BusinessDeveloper", [
      // Inquiry management
      "inquiries:read",
      "inquiries:create",
      "inquiries:update",
      "inquiries:delete",
      "inquiries:assign",
      "inquiries:manage",

      // Settings access
      "settings:read",
      "settings:update",

      // Limited access
      "users:read",
      "blogs:read",
      "careers:read",
      
      // Dashboard access (limited)
      "dashboard:view",
      "dashboard:read",
    ])

    // Editor permissions
    addPermissionsToRole("Editor", [
      // Content editing
      "blogs:read",
      "blogs:update",
      "careers:read",
      "careers:update",

      // Limited access
      "applications:read",
      "inquiries:read",
      
      // Dashboard access (view only)
      "dashboard:view",
    ])

    // Viewer permissions
    addPermissionsToRole("Viewer", [
      // Read-only access to everything
      "blogs:read",
      "careers:read",
      "applications:read",
      "users:read",
      "contacts:read",
      "settings:read",
      "roles:read",
      "permissions:read",
      "inquiries:read",
      
      // Dashboard access (view only)
      "dashboard:view",
    ])

    // Regular user permissions
    addPermissionsToRole("User", [
      // Minimal permissions
      "blogs:read",
      "careers:read",
    ])

    // Create roles
    const createdRoles = await Role.create(roles)
    logger.info(`${createdRoles.length} roles created`)

    // Create users for each role
    const roleMap = createdRoles.reduce((map, role) => {
      map[role.name] = role._id
      return map
    }, {})

    const userPromises = sampleUsers.map((user) => {
      return User.create({
        name: user.name,
        email: user.email,
        password: user.password,
        roles: [roleMap[user.role]],
        isActive: true,
        isEmailVerified: true,
      })
    })

    const createdUsers = await Promise.all(userPromises)
    logger.info(`${createdUsers.length} users created`)

    // Create default settings
    const settings = await Settings.create({
      emailSettings: defaultEmailSettings,
    })
    logger.info("Created default email settings")

    // Create sample inquiries if needed
    if (clearInquiries || (await Inquiry.countDocuments()) === 0) {
      const adminUser = createdUsers.find((u) => u.email === "admin@example.com")
      const bizDevUser = createdUsers.find((u) => u.email === "bizdev@example.com")

      // Assign some inquiries to users
      if (adminUser && bizDevUser) {
        sampleInquiries[1].assignedTo = adminUser._id
        sampleInquiries[2].assignedTo = bizDevUser._id
      }

      await Inquiry.create(sampleInquiries)
      logger.info(`Created ${sampleInquiries.length} sample inquiries`)
    }

    logger.info("Data import completed successfully")
    process.exit()
  } catch (err) {
    logger.error("Error importing data:", err)
    process.exit(1)
  }
}

// Run the import
importData()
