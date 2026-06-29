use adblock::engine::Engine;
use adblock::lists::ParseOptions;
use std::sync::Mutex;
use tauri::State;

pub struct AdblockState {
    pub engine: Mutex<Option<Engine>>,
}

// L'Engine de adblock-rust contient des Rc (non-Send)
// Nous forçons le Send/Sync car nous le protégeons via un Mutex.
unsafe impl Send for AdblockState {}
unsafe impl Sync for AdblockState {}

#[tauri::command]
pub fn check_request(state: State<'_, AdblockState>, url: String, source_url: String, request_type: String) -> Result<bool, String> {
    let engine_guard = state.engine.lock().map_err(|_| "Erreur de verrouillage".to_string())?;
    
    if let Some(engine) = engine_guard.as_ref() {
        let request = adblock::request::Request::new(&url, &source_url, &request_type)
            .map_err(|e| e.to_string())?;
        let block_result = engine.check_network_request(&request);
        Ok(block_result.matched)
    } else {
        // Si le moteur n'est pas chargé, on ne bloque rien
        Ok(false)
    }
}

pub fn init_adblock() -> Engine {
    // Liste de base (EasyList simplifiée pour l'exemple)
    let rules = vec![
        "||doubleclick.net^",
        "||google-analytics.com^",
        "-advertisement-icon.",
        "-advertisement-management/",
        "-advertisement-module.",
    ];
    
    Engine::from_rules(rules, ParseOptions::default())
}
