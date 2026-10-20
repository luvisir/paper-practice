package com.luvisir.paperpractice;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int PICK_FILE = 100, SAVE_FILE = 101;
    private WebView web;
    private ParentStore parentStore;
    private final ExecutorService tasks = Executors.newSingleThreadExecutor();
    private ValueCallback<Uri[]> fileCallback;
    private File pendingExport;
    private boolean closing;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        parentStore = new ParentStore(this);
        FrameLayout layout = new FrameLayout(this);
        layout.setFitsSystemWindows(true);
        layout.setBackgroundColor(Color.rgb(247,248,247));
        web = new WebView(this);
        layout.addView(web, new FrameLayout.LayoutParams(-1,-1));
        setContentView(layout);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setTextZoom(100);
        web.setBackgroundColor(Color.rgb(247,248,247));
        web.addJavascriptInterface(new NativeBridge(), "PaperlyNative");
        web.setWebViewClient(new LocalClient());
        web.setWebChromeClient(new Chrome());
        web.loadUrl("https://"+HOST+"/index.html");
    }
    private boolean trusted(String url) {
        Uri uri = Uri.parse(url);
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost());
    }
    private WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.singletonMap("Cache-Control","no-store"), new ByteArrayInputStream("Offline content unavailable".getBytes(StandardCharsets.UTF_8)));
    }
    private class LocalClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!trusted(uri.toString()) || !"GET".equals(request.getMethod())) return blocked();
            String path = uri.getPath();
            if (path == null || path.equals("/")) path = "/index.html";
            if (path.contains("..") || path.contains("\\") || path.contains("\u0000")) return blocked();
            try {
                String type = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "application/javascript" : path.endsWith(".css") ? "text/css" : path.endsWith(".jpg") ? "image/jpeg" : path.endsWith(".png") ? "image/png" : "application/octet-stream";
                return new WebResourceResponse(type, "UTF-8", 200, "OK", Collections.singletonMap("Cache-Control", "no-cache"), getAssets().open("web"+path));
            } catch (Exception ignored) { return blocked(); }
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (trusted(request.getUrl().toString())) return false;
            Toast.makeText(MainActivity.this,"离线版不打开外部网页",Toast.LENGTH_SHORT).show();
            return true;
        }
        @Override public void onPageFinished(WebView view, String url) {
            if (trusted(url)) view.evaluateJavascript("if(!window.indexedDB||!window.PointerEvent){alert('当前系统浏览器组件过旧，部分书写功能可能不可用，请由家长更新平板系统。')}",null);
        }
    }
    private class Chrome extends WebChromeClient {
        @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            pick.addCategory(Intent.CATEGORY_OPENABLE);
            pick.setType("*/*");
            pick.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/pdf","image/*"});
            pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);
            pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            try { startActivityForResult(pick,PICK_FILE); }
            catch (Exception ignored) { fileCallback.onReceiveValue(null);fileCallback=null;Toast.makeText(MainActivity.this,"此平板未提供文件选择器，请由家长检查系统文件管理功能",Toast.LENGTH_LONG).show(); }
            return true;
        }
        @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result) {
            if (!trusted(url)) { result.cancel(); return true; }
            new AlertDialog.Builder(MainActivity.this).setTitle("纸上作业").setMessage(message).setPositiveButton("知道了",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;
        }
        @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result) {
            if (!trusted(url)) { result.cancel(); return true; }
            new AlertDialog.Builder(MainActivity.this).setTitle("纸上作业").setMessage(message).setPositiveButton("确定",(d,w)->result.confirm()).setNegativeButton("取消",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;
        }
        @Override public boolean onJsPrompt(WebView view,String url,String message,String defaultValue,JsPromptResult result) {
            if (!trusted(url)) { result.cancel(); return true; }
            EditText input = new EditText(MainActivity.this);
            input.setText(defaultValue);
            input.setPadding(30,20,30,20);
            input.setInputType(message.contains("密码")?InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_VARIATION_PASSWORD:InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE);
            new AlertDialog.Builder(MainActivity.this).setTitle(message).setView(input).setPositiveButton("确定",(d,w)->result.confirm(input.getText().toString())).setNegativeButton("取消",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;
        }
    }
    private class NativeBridge {
        @JavascriptInterface public void request(int id,String path,String body) {
            if (path == null || body == null || path.length()>1000 || body.length()>200000) return;
            tasks.execute(()->{
                String result;
                try {
                    Uri uri=Uri.parse("https://local/"+path);
                    String route=uri.getPath().substring(1);
                    String document=uri.getQueryParameter("document");
                    result=parentStore.handle(route,new JSONObject(body),document==null?"":document).toString();
                } catch (Exception ignored) { result="{\"status\":503,\"body\":{\"error\":\"本机操作失败，请重试或先导出答卷\"}}"; }
                final String output=result;
                runOnUiThread(()->{if(!closing)web.evaluateJavascript("window.__paperlyNativeResult("+id+","+output+")",null);});
            });
        }
        @JavascriptInterface public void saveFile(String name,String data) {
            if (name==null || data==null || data.length()>45000000) { notifyExport("文件过大，建议逐页导出图片");return; }
            tasks.execute(()->{
                try {
                    int comma=data.indexOf(',');
                    String header=comma<0?"":data.substring(0,comma);
                    boolean pdf=header.startsWith("data:application/pdf;");
                    if (!pdf && !header.startsWith("data:image/png;")) throw new IllegalArgumentException();
                    byte[] bytes=Base64.decode(data.substring(comma+1),Base64.DEFAULT);
                    File temp=File.createTempFile("paperly-export-",pdf?".pdf":".png",getCacheDir());
                    try(FileOutputStream stream=new FileOutputStream(temp)){stream.write(bytes);}
                    runOnUiThread(()->{
                        if (pendingExport!=null) { temp.delete(); notifyExport("请先完成上一份答卷的保存");return; }
                        pendingExport=temp;
                        Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        save.addCategory(Intent.CATEGORY_OPENABLE);
                        save.setType(pdf?"application/pdf":"image/png");
                        save.putExtra(Intent.EXTRA_TITLE,name.replaceAll("[\\\\/\n\r]","_")+(name.endsWith(pdf?".pdf":".png")?"":pdf?".pdf":".png"));
                        try{startActivityForResult(save,SAVE_FILE);}catch(Exception ignored){pendingExport.delete();pendingExport=null;notifyExport("无法打开系统保存窗口");}
                    });
                }catch(Exception ignored){notifyExport("导出失败，请重试");}
            });
        }
    }
    private void notifyExport(String message) {
        runOnUiThread(()->{Toast.makeText(MainActivity.this,message,Toast.LENGTH_LONG).show();if(!closing)web.evaluateJavascript("if(typeof toast==='function')toast("+JSONObject.quote(message)+")",null);});
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==PICK_FILE && fileCallback!=null){
            Uri[] result=null;
            if(resultCode==RESULT_OK && data!=null){
                if(data.getClipData()!=null){result=new Uri[data.getClipData().getItemCount()];for(int i=0;i<result.length;i++)result[i]=data.getClipData().getItemAt(i).getUri();}
                else if(data.getData()!=null)result=new Uri[]{data.getData()};
            }
            fileCallback.onReceiveValue(result);fileCallback=null;
        }
        if(requestCode==SAVE_FILE && pendingExport!=null){
            final File source=pendingExport;pendingExport=null;
            if(resultCode!=RESULT_OK||data==null||data.getData()==null){source.delete();notifyExport("已取消保存，答卷仍保存在应用中");return;}
            final Uri destination=data.getData();
            tasks.execute(()->{try(FileInputStream input=new FileInputStream(source);OutputStream output=getContentResolver().openOutputStream(destination,"w")){
                if(output==null)throw new IllegalStateException();byte[] buffer=new byte[32768];int n;while((n=input.read(buffer))!=-1)output.write(buffer,0,n);notifyExport("答卷已保存到你选择的位置");
            }catch(Exception ignored){notifyExport("保存失败，请重试");}finally{source.delete();}});
        }
    }
    @Override protected void onPause(){
        super.onPause();parentStore.lock();if(web!=null)web.evaluateJavascript("window.dispatchEvent(new Event('paperly-native-lock'))",null);
    }
    @Override public void onBackPressed(){
        web.evaluateJavascript("(function(){const d=document.querySelector('dialog[open]');if(!d)return false;if(d.id==='parentDialog')window.dispatchEvent(new Event('paperly-native-lock'));else d.close();return true})()",value->{
            if(!"true".equals(value))new AlertDialog.Builder(this).setTitle("退出纸上作业？").setMessage("已经完成的笔迹会保留，下次可以继续。")
                .setPositiveButton("退出",(d,w)->finish()).setNegativeButton("继续答题",null).show();
        });
    }
    @Override protected void onDestroy(){closing=true;parentStore.lock();if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("PaperlyNative");web.destroy();}tasks.shutdown();super.onDestroy();}
}
