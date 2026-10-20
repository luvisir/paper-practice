package com.luvisir.paperpractice;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/** Device-local parent gate. No PIN, answers, or API credentials are exposed to JavaScript. */
final class ParentStore {
    private final SharedPreferences auth;
    private final SharedPreferences reports;
    private long sessionUntil;

    ParentStore(Context context) {
        auth = context.getSharedPreferences("parent_auth", Context.MODE_PRIVATE);
        reports = context.getSharedPreferences("parent_reports", Context.MODE_PRIVATE);
    }
    synchronized void lock() { sessionUntil = 0; }
    private boolean unlocked() { return sessionUntil > System.currentTimeMillis(); }
    private JSONObject result(int status, JSONObject body) throws Exception {
        return new JSONObject().put("status", status).put("body", body);
    }
    private JSONObject error(int status, String message) throws Exception {
        return result(status, new JSONObject().put("error", message));
    }
    private String derive(String pin, String salt) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(pin.toCharArray(), Base64.decode(salt, Base64.NO_WRAP), 120000, 256);
        try {
            return Base64.encodeToString(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1").generateSecret(spec).getEncoded(), Base64.NO_WRAP);
        } finally { spec.clearPassword(); }
    }
    private boolean matches(String pin) throws Exception {
        if (!pin.matches("[0-9]{6}")) return false;
        String existing = auth.getString("hash", "");
        String candidate = derive(pin, auth.getString("salt", ""));
        return MessageDigest.isEqual(existing.getBytes(StandardCharsets.UTF_8), candidate.getBytes(StandardCharsets.UTF_8));
    }
    private void setPin(String pin) throws Exception {
        byte[] bytes = new byte[24]; new SecureRandom().nextBytes(bytes);
        String salt = Base64.encodeToString(bytes, Base64.NO_WRAP);
        if (!auth.edit().putString("salt", salt).putString("hash", derive(pin, salt)).putInt("failures", 0).putLong("lockedUntil", 0).commit())
            throw new IllegalStateException("Save failed");
    }
    private String reportKey(String document) throws Exception {
        byte[] bytes = MessageDigest.getInstance("SHA-256").digest(document.getBytes(StandardCharsets.UTF_8));
        StringBuilder result = new StringBuilder(); for (byte b : bytes) result.append(String.format("%02x", b)); return result.toString();
    }
    private JSONObject report(String document) throws Exception {
        return new JSONObject(reports.getString(reportKey(document), "{\"marks\":[],\"released\":false}"));
    }
    synchronized JSONObject handle(String path, JSONObject body, String document) throws Exception {
        boolean configured = auth.contains("hash");
        if (path.equals("parent/status")) return result(200, new JSONObject().put("configured", configured).put("unlocked", unlocked()).put("aiReady", false).put("expiresAt", sessionUntil));
        if (path.equals("child/review")) {
            JSONObject report = report(document); JSONArray output = new JSONArray();
            if (report.optBoolean("released")) {
                JSONArray marks = report.optJSONArray("marks");
                if (marks != null) for (int i = 0; i < marks.length(); i++) {
                    JSONObject m = marks.getJSONObject(i);
                    if (!"correct".equals(m.optString("status"))) {
                        output.put(new JSONObject().put("id", m.optString("id")).put("x", m.optDouble("x")).put("y", m.optDouble("y")).put("label", m.optString("label")).put("status", m.optString("status")));
                    }
                }
            }
            return result(200, new JSONObject().put("marks", output));
        }
        if (path.equals("parent/setup")) {
            if (configured) return error(409, "已设置家长密码，请解锁");
            String pin = body.optString("pin");
            if (!pin.matches("[0-9]{6}")) return error(400, "请输入六位数字密码");
            setPin(pin); return result(200, new JSONObject().put("ok", true));
        }
        if (!configured) return error(401, "请先由家长设置密码");
        if (path.equals("parent/lock")) { lock(); return result(200, new JSONObject().put("ok", true)); }
        if (path.equals("parent/unlock")) {
            if (auth.getLong("lockedUntil", 0) > System.currentTimeMillis()) return error(429, "连续输错次数过多，已暂时锁定五分钟");
            if (!matches(body.optString("pin"))) {
                int failures = auth.getInt("failures", 0) + 1;
                auth.edit().putInt("failures", failures >= 5 ? 0 : failures).putLong("lockedUntil", failures >= 5 ? System.currentTimeMillis() + 300000 : 0).commit();
                return error(failures >= 5 ? 429 : 401, failures >= 5 ? "已暂时锁定五分钟" : "密码错误，请重试");
            }
            auth.edit().putInt("failures", 0).putLong("lockedUntil", 0).commit();
            sessionUntil = System.currentTimeMillis() + 300000;
            return result(200, new JSONObject().put("ok", true).put("expiresAt", sessionUntil));
        }
        if (!unlocked()) return error(401, "家长模式已锁定，请重新输入密码");
        if (path.equals("parent/change-pin")) {
            if (!matches(body.optString("oldPin")) || !body.optString("pin").matches("[0-9]{6}")) return error(400, "原密码不正确，或新密码不是六位数字");
            setPin(body.optString("pin")); lock(); return result(200, new JSONObject().put("ok", true));
        }
        if (path.equals("parent/review/load")) return result(200, new JSONObject().put("report", report(body.optString("document"))));
        if (path.equals("parent/review/save")) {
            JSONArray input = body.optJSONArray("marks"); String doc = body.optString("document");
            if (input == null || input.length() > 200 || doc.length() > 150) return error(400, "批改内容无效");
            JSONArray clean = new JSONArray();
            for (int i = 0; i < input.length(); i++) {
                JSONObject m = input.getJSONObject(i); String status = m.optString("status");
                if (!status.equals("correct") && !status.equals("wrong") && !status.equals("uncertain")) status = "uncertain";
                JSONObject n = new JSONObject().put("id", limit(m.optString("id"), 80)).put("label", limit(m.optString("label"), 50)).put("status", status)
                    .put("x", position(m.optDouble("x", 0))).put("y", position(m.optDouble("y", 0)))
                    .put("answer", limit(m.optString("answer"), 500)).put("reason", limit(m.optString("reason"), 2000)).put("source", "manual");
                clean.put(n);
            }
            JSONObject report = new JSONObject().put("marks", clean).put("released", body.optBoolean("released")).put("updatedAt", System.currentTimeMillis());
            if (!reports.edit().putString(reportKey(doc), report.toString()).commit()) return error(503, "保存失败，请先导出答卷");
            return result(200, new JSONObject().put("ok", true));
        }
        if (path.equals("parent/grade")) return result(503, new JSONObject().put("error", "当前是离线答题版，尚未接入国内可直连的 AI 服务。你仍可离线手动批改。").put("code", "AI_NOT_CONFIGURED"));
        return error(404, "请求不存在");
    }
    private static double position(double value) { return Double.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; }
    private static String limit(String value, int size) { return value.length() <= size ? value : value.substring(0, size); }
}
