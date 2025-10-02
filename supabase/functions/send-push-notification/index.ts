// FIX: Use a stable Supabase Edge Function type reference to resolve Deno type errors.
/// <reference types="https://esm.sh/@supabase/functions-js@2/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Lấy thông tin cần thiết từ Secrets của Supabase
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !restApiKey) {
      throw new Error("OneSignal App ID hoặc REST API Key chưa được cấu hình trong mục Secrets.");
    }

    // Lấy dữ liệu từ body của request
    const { userIds, message, link } = await req.json();
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !message) {
      throw new Error("Thiếu thông tin userIds (mảng), hoặc message.");
    }

    const notification = {
      app_id: appId,
      include_external_user_ids: userIds,
      contents: { en: message, vi: message },
      headings: { en: "Thông báo HSAPS 2025", vi: "Thông báo HSAPS 2025" },
      web_url: link || Deno.env.get("SUPABASE_URL"), // Fallback về trang chủ
      // Bạn có thể thêm các thông số khác ở đây, ví dụ: icon
      // web_buttons: [{ "id": "read-more-button", "text": "Xem chi tiết", "icon": "..." }]
    };

    // Gửi request đến OneSignal API
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${restApiKey}`,
      },
      body: JSON.stringify(notification),
    });
    
    const responseData = await response.json();

    if (!response.ok) {
        console.error("OneSignal API Error:", responseData);
        const errorMessage = responseData.errors?.join(", ") || "Gửi thông báo qua OneSignal thất bại.";
        throw new Error(errorMessage);
    }
    
    // Trả về kết quả thành công
    return new Response(
      JSON.stringify({ success: true, response: responseData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});