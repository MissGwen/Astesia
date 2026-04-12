use serde_json::Value;
use tauri::State;
use crate::db::DbType;
use crate::state::AppState;

/// Quote an identifier (column name, etc.) using the appropriate syntax for the database type.
fn quote_identifier(name: &str, db_type: &DbType) -> String {
    match db_type {
        DbType::MySQL => format!("`{}`", name),
        DbType::PostgreSQL => format!("\"{}\"", name),
        DbType::SQLite => format!("\"{}\"", name),
        DbType::SQLServer => format!("[{}]", name),
        _ => name.to_string(),
    }
}

/// Quote a table reference using the appropriate syntax for the database type.
/// For PostgreSQL, handles the "schema.table" convention.
fn quote_table(table: &str, db_type: &DbType) -> String {
    match db_type {
        DbType::PostgreSQL => {
            if let Some(dot) = table.find('.') {
                let schema = &table[..dot];
                let tbl = &table[dot + 1..];
                format!("\"{}\".\"{}\"", schema, tbl)
            } else {
                format!("\"{}\"", table)
            }
        }
        DbType::MySQL => format!("`{}`", table),
        DbType::SQLServer => format!("[{}]", table),
        DbType::SQLite => format!("\"{}\"", table),
        _ => format!("\"{}\"", table),
    }
}

#[tauri::command]
pub async fn update_row(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    table: String,
    primary_key_column: String,
    primary_key_value: Value,
    column: String,
    new_value: Value,
) -> Result<u64, String> {
    let connections = state.connections.lock().await;
    let driver = connections.get(&connection_id).ok_or("连接不存在")?;
    let db_type = driver.db_type();

    let pk_val = value_to_sql(&primary_key_value);
    let new_val = value_to_sql(&new_value);
    let tbl = quote_table(&table, &db_type);
    let col = quote_identifier(&column, &db_type);
    let pk_col = quote_identifier(&primary_key_column, &db_type);
    let sql = format!(
        "UPDATE {} SET {} = {} WHERE {} = {}",
        tbl, col, new_val, pk_col, pk_val
    );
    log::info!("Executing UPDATE SQL: {}", sql);
    let result = driver.execute_query(&database, &sql).await.map_err(|e| {
        log::error!("UPDATE failed: {}", e);
        e.to_string()
    })?;
    log::info!("UPDATE affected {} rows", result.affected_rows);
    Ok(result.affected_rows)
}

#[tauri::command]
pub async fn delete_rows(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    table: String,
    primary_key_column: String,
    primary_key_values: Vec<Value>,
) -> Result<u64, String> {
    let connections = state.connections.lock().await;
    let driver = connections.get(&connection_id).ok_or("连接不存在")?;
    let db_type = driver.db_type();

    let vals: Vec<String> = primary_key_values.iter().map(value_to_sql).collect();
    let tbl = quote_table(&table, &db_type);
    let pk_col = quote_identifier(&primary_key_column, &db_type);
    let sql = format!(
        "DELETE FROM {} WHERE {} IN ({})",
        tbl, pk_col, vals.join(", ")
    );
    log::info!("Executing DELETE SQL: {}", sql);
    let result = driver.execute_query(&database, &sql).await.map_err(|e| {
        log::error!("DELETE failed: {}", e);
        e.to_string()
    })?;
    log::info!("DELETE affected {} rows", result.affected_rows);
    Ok(result.affected_rows)
}

#[tauri::command]
pub async fn insert_row(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    table: String,
    columns: Vec<String>,
    values: Vec<Value>,
) -> Result<u64, String> {
    let connections = state.connections.lock().await;
    let driver = connections.get(&connection_id).ok_or("连接不存在")?;
    let db_type = driver.db_type();

    let cols = columns.iter().map(|c| quote_identifier(c, &db_type)).collect::<Vec<_>>().join(", ");
    let vals = values.iter().map(value_to_sql).collect::<Vec<_>>().join(", ");
    let tbl = quote_table(&table, &db_type);
    let sql = format!("INSERT INTO {} ({}) VALUES ({})", tbl, cols, vals);
    log::info!("Executing INSERT SQL: {}", sql);
    let result = driver.execute_query(&database, &sql).await.map_err(|e| {
        log::error!("INSERT failed: {}", e);
        e.to_string()
    })?;
    log::info!("INSERT affected {} rows", result.affected_rows);
    Ok(result.affected_rows)
}

fn value_to_sql(value: &Value) -> String {
    match value {
        Value::Null => "NULL".to_string(),
        Value::Bool(b) => if *b { "1" } else { "0" }.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => format!("'{}'", s.replace('\'', "''")),
        _ => format!("'{}'", value.to_string().replace('\'', "''")),
    }
}

#[tauri::command]
pub async fn redis_set_key(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    key: String,
    value: String,
    ttl: Option<i64>,
) -> Result<String, String> {
    let connections = state.connections.lock().await;
    let driver = connections.get(&connection_id).ok_or("连接不存在")?;

    let mut cmd = format!("SET {} {}", key, value);
    if let Some(t) = ttl {
        if t > 0 { cmd = format!("SET {} {} EX {}", key, value, t); }
    }
    driver.execute_query(&database, &cmd).await.map_err(|e| e.to_string())?;
    Ok("OK".to_string())
}

#[tauri::command]
pub async fn redis_delete_key(
    state: State<'_, AppState>,
    connection_id: String,
    database: String,
    key: String,
) -> Result<u64, String> {
    let connections = state.connections.lock().await;
    let driver = connections.get(&connection_id).ok_or("连接不存在")?;
    let cmd = format!("DEL {}", key);
    let result = driver.execute_query(&database, &cmd).await.map_err(|e| e.to_string())?;
    Ok(result.affected_rows)
}
