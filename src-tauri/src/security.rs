use keyring::Entry;

#[tauri::command]
pub fn save_secure_credential(service: String, username: String, password: String) -> Result<(), String> {
    let entry = Entry::new(&service, &username).map_err(|e| e.to_string())?;
    entry.set_password(&password).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_secure_credential(service: String, username: String) -> Result<String, String> {
    let entry = Entry::new(&service, &username).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_secure_credential(service: String, username: String) -> Result<(), String> {
    let entry = Entry::new(&service, &username).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())
}
