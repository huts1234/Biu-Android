package com.biu.music;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Must be registered before the bridge is created.
        registerPlugin(BiliStreamPlugin.class);
        super.onCreate(savedInstanceState);

        // Media streaming happens over the loopback server; this client stays as
        // a fallback for direct CDN URLs (see BiliMediaWebViewClient).
        WebView webView = bridge == null ? null : bridge.getWebView();
        if (webView != null) {
            webView.setWebViewClient(new BiliMediaWebViewClient(bridge));
        }
    }
}
