
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "account_deletions": {
                  Row: {
                    "deleted_at": string,"executed_by": string,"id": string,"user_id": string,"username": string | null,"via": string
                  }
                  ComputedFields: never
                  Insert: {
                    "deleted_at"?: string,"executed_by": string,"id"?: string,"user_id": string,"username"?: string | null,"via": string
                  }
                  Update: {
                    "deleted_at"?: string,"executed_by"?: string,"id"?: string,"user_id"?: string,"username"?: string | null,"via"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cambios_de_rol": {
                  Row: {
                    "creado_en": string,"ejecutado_por": string,"id": string,"rol_anterior": string,"rol_nuevo": string,"user_id": string,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"ejecutado_por": string,"id"?: string,"rol_anterior": string,"rol_nuevo": string,"user_id": string,"username"?: string | null
                  }
                  Update: {
                    "creado_en"?: string,"ejecutado_por"?: string,"id"?: string,"rol_anterior"?: string,"rol_nuevo"?: string,"user_id"?: string,"username"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"coupons": {
                  Row: {
                    "created_at": string,"digital_awarded": boolean,"dynamic_id": string,"id": string,"physical_awarded": boolean,"redeemed_at": string | null,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"digital_awarded"?: boolean,"dynamic_id": string,"id"?: string,"physical_awarded"?: boolean,"redeemed_at"?: string | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"digital_awarded"?: boolean,"dynamic_id"?: string,"id"?: string,"physical_awarded"?: boolean,"redeemed_at"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coupons_dynamic_id_fkey"
      columns: ["dynamic_id"]
isOneToOne: false
      referencedRelation: "dynamics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coupons_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dynamics": {
                  Row: {
                    "created_at": string,"description": string,"ends_at": string,"id": string,"keyword": string,"physical_redeemed": number,"physical_stock": number,"prize_label": string,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"ends_at": string,"id"?: string,"keyword": string,"physical_redeemed"?: number,"physical_stock": number,"prize_label": string,"starts_at": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"ends_at"?: string,"id"?: string,"keyword"?: string,"physical_redeemed"?: number,"physical_stock"?: number,"prize_label"?: string,"starts_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"estacion": {
                  Row: {
                    "actualizado_en": string,"actualizado_por": string | null,"id": boolean,"periodo_ranking": string,"sabores_ocultos": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"actualizado_por"?: string | null,"id"?: boolean,"periodo_ranking"?: string,"sabores_ocultos"?: (string)[]
                  }
                  Update: {
                    "actualizado_en"?: string,"actualizado_por"?: string | null,"id"?: boolean,"periodo_ranking"?: string,"sabores_ocultos"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"legal_acceptances": {
                  Row: {
                    "accepted_at": string,"ast_hash": string,"doc_id": string,"id": string,"platform": string,"user_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string,"ast_hash": string,"doc_id": string,"id"?: string,"platform": string,"user_id": string,"version": string
                  }
                  Update: {
                    "accepted_at"?: string,"ast_hash"?: string,"doc_id"?: string,"id"?: string,"platform"?: string,"user_id"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"legal_versions": {
                  Row: {
                    "ast_hash": string,"doc_id": string,"published_at": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ast_hash": string,"doc_id": string,"published_at"?: string,"version": string
                  }
                  Update: {
                    "ast_hash"?: string,"doc_id"?: string,"published_at"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "age_confirmed_at": string | null,"avatar_url": string | null,"birthday_day": number | null,"birthday_month": number | null,"created_at": string,"email": string | null,"excluir_de_listas": boolean,"first_name": string | null,"google_bonus_awarded": boolean,"id": string,"is_admin": boolean,"last_name": string | null,"phone": string | null,"profile_bonus_awarded": boolean,"role": string,"total_points": number,"username": string | null,"whatsapp_opt_in": boolean,"whatsapp_opt_in_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "age_confirmed_at"?: string | null,"avatar_url"?: string | null,"birthday_day"?: number | null,"birthday_month"?: number | null,"created_at"?: string,"email"?: string | null,"excluir_de_listas"?: boolean,"first_name"?: string | null,"google_bonus_awarded"?: boolean,"id": string,"is_admin"?: boolean,"last_name"?: string | null,"phone"?: string | null,"profile_bonus_awarded"?: boolean,"role"?: string,"total_points"?: number,"username"?: string | null,"whatsapp_opt_in"?: boolean,"whatsapp_opt_in_at"?: string | null
                  }
                  Update: {
                    "age_confirmed_at"?: string | null,"avatar_url"?: string | null,"birthday_day"?: number | null,"birthday_month"?: number | null,"created_at"?: string,"email"?: string | null,"excluir_de_listas"?: boolean,"first_name"?: string | null,"google_bonus_awarded"?: boolean,"id"?: string,"is_admin"?: boolean,"last_name"?: string | null,"phone"?: string | null,"profile_bonus_awarded"?: boolean,"role"?: string,"total_points"?: number,"username"?: string | null,"whatsapp_opt_in"?: boolean,"whatsapp_opt_in_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_estacion_aplicar_periodo":
{ Args: { "p_actor": string,"p_periodo": string }; Returns: Json
                           },
"_estacion_aplicar_sabor":
{ Args: { "p_actor": string,"p_sabor": string,"p_visible": boolean }; Returns: Json
                           },
"_estacion_aplicar_todos":
{ Args: { "p_actor": string }; Returns: Json
                           },
"_metricas_kpis":
{ Args: { "p_desde": string,"p_dinamicas": (string)[],"p_hasta": string,"p_segmento": string }; Returns: Json
                           },
"_metricas_puntos":
{ Args: { "p_desde": string,"p_dinamicas": (string)[],"p_hasta": string,"p_segmento": string }; Returns: {
              "dynamic_id": string,"pts": number,"t": string,"tipo": string,"user_id": string
            }[]
                           },
"_metricas_segmento":
{ Args: { "p_desde": string,"p_hasta": string,"p_segmento": string }; Returns: {
              "user_id": string
            }[]
                           },
"abrir_bote":
{ Args: { "p_codigo": string,"p_comando_id": string,"p_ignorar_abierto": boolean,"p_ignorar_mas_viejo": boolean }; Returns: Json
                           },
"abrir_caja":
{ Args: { "p_contado": number,"p_id": string }; Returns: Json
                           },
"accept_legal":
{ Args: { "p_docs": Json,"p_platform": string }; Returns: Json
                           },
"agregar_gasto_fijo":
{ Args: { "p_estacion_id": string,"p_id": string,"p_nombre": string }; Returns: Json
                           },
"agregar_proveedor":
{ Args: { "p_estacion_id": string,"p_id": string,"p_nombre": string,"p_telefono": string,"p_tipos": (string)[] }; Returns: Json
                           },
"anotar_etiquetas_bajadas":
{ Args: { "p_codigos": (string)[],"p_estacion_id": string,"p_pedido_id": string }; Returns: Json
                           },
"aprobar_activacion":
{ Args: { "p_codigo": string,"p_estacion_id": string }; Returns: Json
                           },
"asignar_consumo_sin_bote":
{ Args: { "p_bote_id": string,"p_comando_id": string,"p_sabor_id": string }; Returns: Json
                           },
"asignar_rol":
{ Args: { "p_rol": string,"p_usuario": string }; Returns: Json
                           },
"buscar_cuenta":
{ Args: { "p_correo": string }; Returns: Json
                           },
"cambiar_modo":
{ Args: { "p_modo": string }; Returns: Json
                           },
"cambiar_proveedor":
{ Args: { "p_estacion_id": string,"p_nombre": string,"p_proveedor_id": string,"p_telefono": string,"p_tipos": (string)[] }; Returns: Json
                           },
"cancelar_venta":
{ Args: { "p_id": string,"p_motivo": string,"p_servido": boolean,"p_venta_id": string }; Returns: Json
                           },
"capturar_venta":
{ Args: { "p_articulos": Json,"p_hora_real": string,"p_id": string,"p_monto_tarjeta": number,"p_total": number,"p_version": number }; Returns: Json
                           },
"cerrar_caja":
{ Args: { "p_abrir_hoy": boolean,"p_id": string,"p_retiro": number }; Returns: Json
                           },
"cerrar_marcador":
{ Args: { "p_codigo": string,"p_comando_id": string,"p_merma": boolean,"p_motivo": string,"p_tipo": string }; Returns: Json
                           },
"cerrar_seccion":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"complete_signup":
{ Args: { "p_age_confirmed": boolean,"p_legal": Json,"p_phone": string,"p_platform": string,"p_username": string,"p_whatsapp_opt_in": boolean }; Returns: Json
                           },
"confirmar_asistencias":
{ Args: { "p_comando_id": string,"p_marcas": Json }; Returns: Json
                           },
"contar_cierre":
{ Args: { "p_contado": number,"p_id": string }; Returns: Json
                           },
"corregir_pedido":
{ Args: { "p_datos": Json,"p_estacion_id": string,"p_id": string,"p_motivo": string,"p_pedido_id": string,"p_tipo": string }; Returns: Json
                           },
"corregir_precio":
{ Args: { "p_estacion_id": string,"p_id": string,"p_motivo": string,"p_precio": number,"p_renglon_id": string }; Returns: Json
                           },
"definir_pin":
{ Args: { "p_pin": string }; Returns: Json
                           },
"desbloquear_mi_pin":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"entrar_a_seccion":
{ Args: { "p_persona": string,"p_pin": string,"p_seccion": string }; Returns: Json
                           },
"entregar_pedido":
{ Args: { "p_venta_id": string }; Returns: Json
                           },
"estacion_mostrar_todos":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"estacion_set_periodo":
{ Args: { "p_periodo": string }; Returns: Json
                           },
"estacion_set_sabor":
{ Args: { "p_sabor": string,"p_visible": boolean }; Returns: Json
                           },
"get_leaderboard":
{ Args: { "p_period"?: string }; Returns: {
              "es_tu_fila": boolean,"points": number,"username": string
            }[]
                           },
"get_leaderboard_range":
{ Args: { "p_period": string }; Returns: {
              "range_end": string,"range_start": string
            }[]
                           },
"google_name_parts":
{ Args: { "p_data": Json }; Returns: {
              "first_name": string,"last_name": string
            }[]
                           },
"guardar_estacion":
{ Args: { "p_calle": string,"p_ciudad": string,"p_codigo_postal": string,"p_colonia": string,"p_estado": string,"p_id": string,"p_nombre": string }; Returns: Json
                           },
"guardar_persona":
{ Args: { "p_estaciones": (string)[],"p_persona_id": string,"p_rol": string,"p_salario": number }; Returns: Json
                           },
"guardar_premio_dinamica":
{ Args: { "p_a_elegir": boolean,"p_costo": number,"p_dynamic_id": string,"p_presentacion": string,"p_sabor": string,"p_tipo": string }; Returns: Json
                           },
"hook_google_only_signup":
{ Args: { "event": Json }; Returns: Json
                           },
"identificarme":
{ Args: { "p_persona": string,"p_pin": string }; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_superadmin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"justificar_cierre":
{ Args: { "p_conceptos": Json,"p_id": string }; Returns: Json
                           },
"legal_current_versions":
{ Args: Record<PropertyKey, never>; Returns: {
              "ast_hash": string,"doc_id": string,"version": string
            }[]
                           },
"marcar_excluir_de_listas":
{ Args: { "p_excluir": boolean,"p_usuario": string }; Returns: Json
                           },
"marcar_pagado":
{ Args: { "p_estacion_id": string,"p_fecha": string,"p_forma": string,"p_pedido_id": string }; Returns: Json
                           },
"metricas_clientes":
{ Args: { "p_desde": string,"p_dinamicas"?: (string)[],"p_hasta": string,"p_segmento"?: string }; Returns: Json
                           },
"metricas_dinamicas":
{ Args: { "p_desde": string,"p_dinamicas"?: (string)[],"p_hasta": string,"p_segmento"?: string }; Returns: Json
                           },
"metricas_horarios":
{ Args: { "p_desde": string,"p_dinamicas"?: (string)[],"p_hasta": string,"p_segmento"?: string }; Returns: Json
                           },
"metricas_lista":
{ Args: { "p_desde": string,"p_dinamicas"?: (string)[],"p_hasta": string,"p_limite"?: number,"p_lista": string,"p_segmento"?: string }; Returns: Json
                           },
"metricas_resumen":
{ Args: { "p_desde": string,"p_dinamicas"?: (string)[],"p_hasta": string,"p_segmento"?: string }; Returns: Json
                           },
"metricas_serie":
{ Args: { "p_desde": string,"p_dinamicas"?: (string)[],"p_granularidad"?: string,"p_hasta": string,"p_segmento"?: string }; Returns: Json
                           },
"my_legal_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"pasar_contenido":
{ Args: { "p_bolitas": number,"p_comando_id": string,"p_destino": string,"p_origen": string }; Returns: Json
                           },
"phone_is_valid":
{ Args: { "p_phone": string }; Returns: boolean
                           },
"poner_precio":
{ Args: { "p_estacion_id": string,"p_precio": number,"p_renglon_id": string }; Returns: Json
                           },
"preparar_gasto":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"preparar_gasto_personal":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"preparar_pedido":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"preparar_pedido_por_tipo":
{ Args: { "p_estacion_id": string,"p_tipo": string }; Returns: Json
                           },
"preparar_retiro":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"preparar_retiro_personal":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"quitar_rol":
{ Args: { "p_persona_id": string }; Returns: Json
                           },
"recibir_pedido":
{ Args: { "p_comando_id": string,"p_no_pedidos": Json,"p_pedido_id": string,"p_sabores": Json }; Returns: Json
                           },
"recibir_productos":
{ Args: { "p_comando_id": string,"p_pedido_id": string,"p_renglones": Json }; Returns: Json
                           },
"reclamar_llave":
{ Args: { "p_secreto": string }; Returns: Json
                           },
"redeem_keyword":
{ Args: { "p_keyword": string }; Returns: Json
                           },
"registrar_carga_inicial":
{ Args: { "p_distribuidor": string,"p_envases": number,"p_estacion_id": string,"p_id": string,"p_sabores": Json }; Returns: Json
                           },
"registrar_gasto":
{ Args: { "p_clase": string,"p_descripcion": string,"p_gasto_fijo_id": string,"p_id": string,"p_monto": number }; Returns: Json
                           },
"registrar_gasto_personal":
{ Args: { "p_clase": string,"p_descripcion": string,"p_estacion_id": string,"p_forma_pago": string,"p_gasto_fijo_id": string,"p_id": string,"p_monto": number }; Returns: Json
                           },
"registrar_inventario_inicial":
{ Args: { "p_id": string,"p_renglones": Json }; Returns: Json
                           },
"registrar_inversion":
{ Args: { "p_descripcion": string,"p_estacion_id": string,"p_forma_pago": string,"p_id": string,"p_monto": number }; Returns: Json
                           },
"registrar_llegada":
{ Args: { "p_id": string,"p_renglones": Json }; Returns: Json
                           },
"registrar_merma":
{ Args: { "p_bolitas": number,"p_codigo": string,"p_comando_id": string,"p_completo": boolean,"p_motivo": string }; Returns: Json
                           },
"registrar_pedido":
{ Args: { "p_distribuidor": string,"p_envases": number,"p_estacion_id": string,"p_id": string,"p_sabores": Json }; Returns: Json
                           },
"registrar_pedido_de_productos":
{ Args: { "p_estacion_id": string,"p_id": string,"p_pago": string,"p_proveedor_id": string,"p_renglones": Json,"p_tipo": string,"p_ya_llego": boolean }; Returns: Json
                           },
"registrar_retiro":
{ Args: { "p_asistencia_id": string,"p_destino": string,"p_id": string,"p_monto": number,"p_pedido_id": string }; Returns: Json
                           },
"registrar_retiro_personal":
{ Args: { "p_asistencia_id": string,"p_destino": string,"p_estacion_id": string,"p_id": string,"p_monto": number,"p_pedido_id": string }; Returns: Json
                           },
"registrar_venta":
{ Args: { "p_articulos": Json,"p_id": string,"p_monto_tarjeta": number,"p_recibido": number,"p_total": number,"p_version": number }; Returns: Json
                           },
"revocar_tableta":
{ Args: { "p_dispositivo_id": string,"p_estacion_id": string,"p_motivo": string }; Returns: Json
                           },
"saldar_pedido":
{ Args: { "p_estacion_id": string,"p_fecha": string,"p_forma": string,"p_id": string,"p_nota": string,"p_pedido_id": string }; Returns: Json
                           },
"salir_de_tableta":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"scan_coupon":
{ Args: { "p_coupon_id": string }; Returns: Json
                           },
"solicitar_activacion":
{ Args: { "p_nombre": string,"p_plataforma": string,"p_secreto_hash": string }; Returns: Json
                           },
"terminar_bote":
{ Args: { "p_codigo": string,"p_comando_id": string }; Returns: Json
                           },
"traspasar_caja":
{ Args: { "p_contado": number,"p_id": string }; Returns: Json
                           },
"update_my_profile":
{ Args: { "p_birthday_day": number,"p_birthday_month": number,"p_first_name": string,"p_last_name": string,"p_phone": string,"p_whatsapp_opt_in": boolean }; Returns: Json
                           },
"username_available":
{ Args: { "p_username": string }; Returns: boolean
                           },
"ver_asistencias_del_cierre":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_bote":
{ Args: { "p_codigo": string }; Returns: Json
                           },
"ver_botes":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_botes_sin_etiqueta":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_caja":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_catalogo":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_cierre":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_consumibles":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_consumo_sin_bote":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_estaciones":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_inicio":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_inversiones":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"ver_mi_sesion":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_mis_errores_de_pin":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_panel":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"ver_pedido":
{ Args: { "p_estacion_id": string,"p_pedido_id": string }; Returns: Json
                           },
"ver_pedido_de_productos":
{ Args: { "p_estacion_id": string,"p_pedido_id": string }; Returns: Json
                           },
"ver_pedidos":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"ver_pedidos_de_productos":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"ver_pedidos_por_recibir":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_personal":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_personas_tableta":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_por_entregar":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_premio_dinamica":
{ Args: { "p_dynamic_id": string }; Returns: Json
                           },
"ver_proveedores":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"ver_recepcion":
{ Args: { "p_pedido_id": string }; Returns: Json
                           },
"ver_revision_dinamicas":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_seguimiento_de_pedido":
{ Args: { "p_estacion_id": string,"p_pedido_id": string }; Returns: Json
                           },
"ver_seguimiento_de_pedidos":
{ Args: { "p_estacion_id": string,"p_todos": boolean }; Returns: Json
                           },
"ver_solicitud":
{ Args: { "p_codigo": string,"p_estacion_id": string }; Returns: Json
                           },
"ver_tableta":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_tabletas":
{ Args: { "p_estacion_id": string }; Returns: Json
                           },
"ver_ventas_del_dia":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ver_ventas_del_rato":
{ Args: { "p_hora": string }; Returns: Json
                           },
"ya_lo_mande":
{ Args: { "p_estacion_id": string,"p_pedido_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
