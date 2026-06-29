use tauri::{AppHandle, Manager, webview::WebviewBuilder, WebviewUrl};

#[tauri::command]
pub fn create_native_tab(app: AppHandle, id: String, url: String) -> Result<(), String> {
    let main_window = app.get_window("main").ok_or("Fenêtre principale introuvable")?;
    
    // Tauri V2 Webview API
    // On crée une vue native (child webview)
    let builder = WebviewBuilder::new(id, WebviewUrl::App(url.into())).auto_resize();
    let _webview = main_window.add_child(
        builder,
        tauri::Position::Logical(tauri::LogicalPosition::new(0.0, 100.0)),
        tauri::Size::Logical(tauri::LogicalSize::new(1920.0, 1080.0))
    ).map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
pub fn switch_native_tab(app: AppHandle, id: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview_window(&id) {
        webview.show().map_err(|e| e.to_string())?;
    }
    // Cacher les autres (logique à enrichir)
    Ok(())
}
