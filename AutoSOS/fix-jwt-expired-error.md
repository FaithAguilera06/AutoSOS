# Fix JWT Expired Error

## What is JWT Expired Error?
The "jwt expired" error occurs when your Supabase authentication token has expired. JWT (JSON Web Token) tokens have a limited lifespan for security reasons.

## Solutions

### 1. Refresh Your Session (Recommended)
The easiest way to fix this is to refresh your authentication session:

```typescript
// In your Angular service or component
async refreshSession() {
  try {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error);
      // Redirect to login
      this.router.navigate(['/login']);
    } else {
      console.log('Session refreshed successfully');
    }
  } catch (error) {
    console.error('Error refreshing session:', error);
    this.router.navigate(['/login']);
  }
}
```

### 2. Check Session Before API Calls
Add session validation before making database calls:

```typescript
async checkAndRefreshSession() {
  const { data: { session }, error } = await this.supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return false;
  }
  
  if (!session) {
    console.log('No active session');
    this.router.navigate(['/login']);
    return false;
  }
  
  // Check if token is close to expiring (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at || 0;
  const timeUntilExpiry = expiresAt - now;
  
  if (timeUntilExpiry < 300) { // 5 minutes
    console.log('Token expiring soon, refreshing...');
    await this.refreshSession();
  }
  
  return true;
}
```

### 3. Add Global Error Handler
Create an interceptor to handle JWT errors globally:

```typescript
// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { SupabaseService } from './services/supabase.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && error.error?.message?.includes('jwt expired')) {
          // Try to refresh the session
          return this.supabase.auth.refreshSession().pipe(
            switchMap(({ data, error: refreshError }) => {
              if (refreshError) {
                // Refresh failed, redirect to login
                this.router.navigate(['/login']);
                return throwError(() => refreshError);
              }
              // Retry the original request
              return next.handle(req);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
```

### 4. Update Your Supabase Service
Add automatic session refresh to your Supabase service:

```typescript
// supabase.service.ts
export class SupabaseService {
  constructor() {
    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // User signed out or session expired
        this.router.navigate(['/login']);
      }
    });
  }

  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return { data: null, error };
    }
    
    // Check if session is close to expiring
    if (data.session) {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = data.session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 300) { // 5 minutes
        console.log('Session expiring soon, refreshing...');
        await this.refreshSession();
      }
    }
    
    return { data, error: null };
  }

  async refreshSession() {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error);
      this.router.navigate(['/login']);
    }
    return { data, error };
  }
}
```

### 5. Quick Fix for Development
If you're in development and want a quick fix, you can sign out and sign back in:

```typescript
// Quick fix - sign out and redirect to login
async quickFix() {
  await this.supabase.auth.signOut();
  this.router.navigate(['/login']);
}
```

## Prevention

### 1. Set Up Automatic Refresh
Add this to your app initialization:

```typescript
// app.component.ts
export class AppComponent implements OnInit {
  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    // Check session on app start
    await this.checkAndRefreshSession();
    
    // Set up periodic session check (every 10 minutes)
    setInterval(() => {
      this.checkAndRefreshSession();
    }, 10 * 60 * 1000);
  }

  private async checkAndRefreshSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    
    if (session) {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 300) { // 5 minutes
        await this.supabase.auth.refreshSession();
      }
    }
  }
}
```

### 2. Configure Token Expiry
In your Supabase dashboard, you can adjust token expiry settings:
- Go to Authentication > Settings
- Adjust "JWT expiry limit" (default is 1 hour)
- Consider increasing it for development

## Testing the Fix

1. **Check Current Session:**
```typescript
const { data: { session } } = await this.supabase.auth.getSession();
console.log('Current session:', session);
console.log('Expires at:', new Date(session?.expires_at * 1000));
```

2. **Test Refresh:**
```typescript
const { data, error } = await this.supabase.auth.refreshSession();
console.log('Refresh result:', { data, error });
```

3. **Monitor Auth State:**
```typescript
this.supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
});
```

## Common Causes

1. **Token Expired** - Most common cause
2. **Network Issues** - Intermittent connection problems
3. **Clock Skew** - System time is incorrect
4. **Invalid Token** - Token was corrupted or modified
5. **Supabase Configuration** - JWT settings in Supabase dashboard

## Best Practices

1. **Always check session before API calls**
2. **Implement automatic refresh**
3. **Handle auth errors gracefully**
4. **Provide clear user feedback**
5. **Redirect to login when needed**
6. **Log auth events for debugging**

Try the session refresh first, and if that doesn't work, implement the automatic refresh mechanism for a more robust solution.
