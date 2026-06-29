use redb::{Database, TableDefinition};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const HISTORY_TABLE: TableDefinition<&str, &str> = TableDefinition::new("history");
const VAULT_TABLE: TableDefinition<&str, &str> = TableDefinition::new("vault");
const SETTINGS_TABLE: TableDefinition<&str, &str> = TableDefinition::new("settings");

pub struct AppState {
    pub db: Mutex<Option<Database>>,
}

pub fn init_db(app: &AppHandle) -> Result<Database, redb::Error> {
    let mut db_path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    std::fs::create_dir_all(&db_path).unwrap_or_default();
    db_path.push("domus.redb");

    let db = Database::create(&db_path)?;
    
    // Initialiser les tables
    let write_txn = db.begin_write()?;
    {
        let _ = write_txn.open_table(HISTORY_TABLE)?;
        let _ = write_txn.open_table(VAULT_TABLE)?;
        let _ = write_txn.open_table(SETTINGS_TABLE)?;
    }
    write_txn.commit()?;

    Ok(db)
}

#[tauri::command]
pub fn save_setting(state: tauri::State<AppState>, key: String, value: String) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|_| "Erreur de verrouillage".to_string())?;
    if let Some(db) = db_guard.as_ref() {
        let write_txn = db.begin_write().map_err(|e| e.to_string())?;
        {
            let mut table = write_txn.open_table(SETTINGS_TABLE).map_err(|e| e.to_string())?;
            table.insert(key.as_str(), value.as_str()).map_err(|e| e.to_string())?;
        }
        write_txn.commit().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("BDD non initialisée".to_string())
    }
}

#[tauri::command]
pub fn get_setting(state: tauri::State<AppState>, key: String) -> Result<Option<String>, String> {
    let db_guard = state.db.lock().map_err(|_| "Erreur de verrouillage".to_string())?;
    if let Some(db) = db_guard.as_ref() {
        let read_txn = db.begin_read().map_err(|e| e.to_string())?;
        let table = read_txn.open_table(SETTINGS_TABLE).map_err(|e| e.to_string())?;
        let value = table.get(key.as_str()).map_err(|e| e.to_string())?;
        Ok(value.map(|v| v.value().to_string()))
    } else {
        Err("BDD non initialisée".to_string())
    }
}
