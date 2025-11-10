# Sales Application 2.0

A comprehensive Next.js application with role-based authentication, GraphQL API, and user management system.

## Features

- **Role-Based Authentication**: Support for 4 different roles:
  - Super Admin
  - Admin
  - AdminTeam
  - Client

- **GraphQL API**: Full GraphQL implementation with Apollo Server
- **User Management**: Complete CRUD operations for user management
- **MongoDB Integration**: MongoDB database with Mongoose ODM
- **Tailwind CSS**: Modern and responsive UI design
- **Protected Routes**: Authentication-based route protection
- **Email Notifications**: Automatic welcome emails for new users and password change notifications
- **Password Management**: Admin and Super Admin can change any user's password

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Apollo Server
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **GraphQL**: Apollo Client & Server

## Prerequisites

- Node.js 20 or higher
- MongoDB Atlas account (or local MongoDB instance)
- npm or yarn

## Installation

1. Clone the repository or navigate to the project directory:
```bash
cd sales-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb+srv://akkiwebs:ramram@info.4vjqojs.mongodb.net/Product_Market
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NEXTAUTH_SECRET=your-nextauth-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000

# SMTP Email Configuration (Optional - for welcome emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=Sales Management System
```

**Note:** For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password. If SMTP is not configured, the application will still work but won't send emails.

4. Seed the database with initial users:
```bash
npm run seed
```

This will create 4 test users:
- **Super Admin**: superadmin@example.com / password123
- **Admin**: admin@example.com / password123
- **AdminTeam**: adminteam@example.com / password123
- **Client**: client@example.com / password123

## Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

3. You will be redirected to the login page. Use one of the test credentials above.

## Project Structure

```
sales-app/
├── app/
│   ├── api/
│   │   └── graphql/
│   │       └── route.js          # GraphQL API endpoint
│   ├── components/
│   │   ├── Sidebar.js            # Dashboard sidebar navigation
│   │   ├── UserForm.js           # User create/edit form
│   │   └── UserList.js           # User list component
│   ├── dashboard/
│   │   ├── layout.js             # Dashboard layout
│   │   ├── page.js               # Dashboard home page
│   │   └── users/
│   │       └── page.js           # User management page
│   ├── login/
│   │   └── page.js               # Login page
│   ├── layout.js                 # Root layout
│   ├── page.js                   # Root page (redirects)
│   └── providers.js              # Apollo Provider wrapper
├── graphql/
│   ├── resolvers/
│   │   └── userResolvers.js      # GraphQL resolvers
│   └── schema/
│       └── userSchema.js         # GraphQL schema
├── lib/
│   ├── apolloClient.js           # Apollo Client configuration
│   ├── auth.js                   # Authentication utilities
│   └── mongodb.js                # MongoDB connection
├── models/
│   └── User.js                   # User model schema
├── scripts/
│   └── seed.js                   # Database seed script
└── .env.local                     # Environment variables
```

## GraphQL API

The GraphQL API is available at `/api/graphql`.

### Queries

- `getUsers`: Get all users (requires Admin or Super Admin role)
- `getUser(id: ID!)`: Get a specific user
- `getCurrentUser`: Get the currently authenticated user

### Mutations

- `login(email: String!, password: String!)`: Login and get JWT token
- `register(...)`: Register a new user
- `createUser(...)`: Create a new user (requires Admin or Super Admin role)
- `updateUser(...)`: Update a user (requires Admin or Super Admin role)
- `deleteUser(id: ID!)`: Delete a user (requires Super Admin role)

## Role Permissions

- **Super Admin**: Full access to all features, can delete users
- **Admin**: Can create, read, and update users
- **AdminTeam**: Can view dashboard
- **Client**: Can view dashboard

## User Management

Users with Admin or Super Admin roles can:
- View all users in a table
- Create new users
- Edit existing users
- Delete users (Super Admin only)

## Development

- Run linting: `npm run lint`
- Format code: `npm run format`
- Build for production: `npm run build`
- Start production server: `npm start`

## Notes

- All code is written in JavaScript (no TypeScript)
- JWT tokens are stored in cookies
- Passwords are hashed using bcryptjs
- The application uses MongoDB Atlas connection string provided
- Email notifications are sent automatically when new users are created
- Password changes are properly hashed and stored in the database
- SMTP email configuration is optional - the app works without it but won't send emails

## Troubleshooting

1. **MongoDB Connection Issues**: Ensure your MongoDB connection string is correct and your IP is whitelisted in MongoDB Atlas.

2. **GraphQL Errors**: Check that all environment variables are set correctly in `.env.local`.

3. **Authentication Issues**: Clear cookies and try logging in again.

4. **Module Import Errors**: Ensure you're using Node.js 20+ and all dependencies are installed.

## License

This project is private and proprietary.
