// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod security;
mod network;
mod tabs;

use tauri::Manager;
use std::sync::Mutex;
use database::AppState;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db = database::init_db(&app.handle()).expect("Échec d'initialisation de la BDD Redb");
            let adblock_engine = network::init_adblock();
            
            app.manage(database::AppState {
                db: Mutex::new(Some(db)),
            });
            app.manage(network::AdblockState {
                engine: Mutex::new(Some(adblock_engine)),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            database::save_setting,
            database::get_setting,
            security::save_secure_credential,
            security::get_secure_credential,
            security::delete_secure_credential,
            network::check_request,
            tabs::create_native_tab,
            tabs::switch_native_tab
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
