package com.biu.music;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Exposes the loopback media server port to the web layer. */
@CapacitorPlugin(name = "BiliStream")
public class BiliStreamPlugin extends Plugin {

    @PluginMethod
    public void getPort(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("port", BiliStreamServer.start());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("stream server unavailable", error);
        }
    }
}
