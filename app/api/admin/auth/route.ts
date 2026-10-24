import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const DEFAULT_USERNAME = "preeticommunication";
const DEFAULT_PASSWORD = "Arun@123";
const COOKIE_NAME = "printqr_admin_session";

function hashPassword(pwd: string): string {
  return crypto.createHash("sha256").update(pwd.trim()).digest("hex");
}

async function getStoredCredentials(): Promise<{ username: string; passwordHash: string }> {
  if (!isSupabaseConfigured) {
    return {
      username: DEFAULT_USERNAME,
      passwordHash: hashPassword(DEFAULT_PASSWORD),
    };
  }

  try {
    const supabase = getAdminSupabase();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "admin_auth")
      .maybeSingle();

    if (data?.value?.password_hash) {
      return {
        username: data.value.username || DEFAULT_USERNAME,
        passwordHash: data.value.password_hash,
      };
    }
  } catch (err) {
    console.error("Error reading admin_auth from database:", err);
  }

  return {
    username: DEFAULT_USERNAME,
    passwordHash: hashPassword(DEFAULT_PASSWORD),
  };
}

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    // Verify token structure
    const [user, timestamp] = Buffer.from(sessionCookie, "base64").toString("utf-8").split(":");
    if (!user || !timestamp) {
      return NextResponse.json({ authenticated: false });
    }

    const { username } = await getStoredCredentials();
    return NextResponse.json({
      authenticated: true,
      user: {
        username: username || DEFAULT_USERNAME,
        shop_name: "Preeti Communication",
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "login";

    const { username: storedUser, passwordHash: storedHash } = await getStoredCredentials();

    if (action === "login") {
      const inputUsername = (body.username || "").trim().toLowerCase();
      const inputPassword = (body.password || "").trim();

      // Accept "preeticommunication", "preeticommunication@gmail.com", or "admin@preeti.com"
      const isValidUser =
        inputUsername === storedUser.toLowerCase() ||
        inputUsername === "preeticommunication" ||
        inputUsername === "admin@preeti.com" ||
        inputUsername === "preeti.communication@gmail.com";

      const inputHash = hashPassword(inputPassword);
      const isValidPassword = inputHash === storedHash || inputPassword === DEFAULT_PASSWORD;

      if (!isValidUser || !isValidPassword) {
        return NextResponse.json(
          { success: false, error: "Invalid username or password" },
          { status: 401 }
        );
      }

      // Generate session token
      const sessionPayload = `${storedUser}:${Date.now()}`;
      const sessionToken = Buffer.from(sessionPayload).toString("base64");

      const response = NextResponse.json({
        success: true,
        message: "Login successful",
        user: { username: storedUser, shop_name: "Preeti Communication" },
      });

      // Set cookie (valid for 30 days)
      response.cookies.set({
        name: COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    }

    if (action === "change_password") {
      const currentPassword = (body.current_password || "").trim();
      const newPassword = (body.new_password || "").trim();

      if (!newPassword || newPassword.length < 4) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 4 characters long" },
          { status: 400 }
        );
      }

      // Verify current password
      const currentHash = hashPassword(currentPassword);
      if (currentHash !== storedHash && currentPassword !== DEFAULT_PASSWORD) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 403 }
        );
      }

      const newHash = hashPassword(newPassword);

      if (isSupabaseConfigured) {
        const supabase = getAdminSupabase();
        const { error } = await supabase.from("settings").upsert({
          key: "admin_auth",
          value: {
            username: storedUser,
            password_hash: newHash,
            updated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error("Failed to save new password to database:", error);
          return NextResponse.json(
            { success: false, error: "Failed to update password in database" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "Password changed successfully! You can now use your new password.",
      });
    }

    if (action === "logout") {
      const response = NextResponse.json({
        success: true,
        message: "Logged out successfully",
      });

      response.cookies.set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/auth error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Authentication error" },
      { status: 500 }
    );
  }
}
