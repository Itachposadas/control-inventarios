# backend/catalogo_herramientas.py
# Herramientas con las que arranca el catálogo de préstamos.
# Se cargan una sola vez, cuando se crea la tabla; después el catálogo se
# administra desde el sistema (registrar, editar, eliminar).
# (nombre, cantidad)

HERRAMIENTAS_INICIALES = [
    # Llaves
    ("Juego de llaves combinadas estándar (1/4\" a 1\")", 1),
    ("Juego de llaves combinadas métricas (8 a 24 mm)", 1),
    ("Juego de llaves españolas (de boca)", 1),
    ("Juego de llaves de estrías", 1),
    ("Juego de llaves Allen estándar", 1),
    ("Juego de llaves Allen métricas", 1),
    ("Juego de llaves Torx", 1),
    ("Llave perica (ajustable) 12\"", 2),
    ("Llave stillson (de tubo) 14\"", 1),
    ("Llave de cruz para birlos", 2),
    ("Llave de filtro de aceite", 1),
    ("Llave de bujías", 1),
    ("Llave de tuercas de líneas (de freno)", 1),

    # Dados y matraca
    ("Juego de dados 1/4\"", 1),
    ("Juego de dados 3/8\"", 1),
    ("Juego de dados 1/2\"", 1),
    ("Juego de dados de impacto 1/2\"", 1),
    ("Juego de dados 3/4\" (camión)", 1),
    ("Matraca 1/4\"", 1),
    ("Matraca 3/8\"", 2),
    ("Matraca 1/2\"", 2),
    ("Maneral de fuerza (barra) 1/2\"", 1),
    ("Juego de extensiones para dados", 1),
    ("Juego de nudos universales (cardán)", 1),
    ("Llave de torque (torquímetro) 1/2\"", 1),

    # Desarmadores y pinzas
    ("Juego de desarmadores planos", 1),
    ("Juego de desarmadores de cruz", 1),
    ("Pinzas de presión (perro)", 2),
    ("Pinzas de electricista", 1),
    ("Pinzas de punta", 1),
    ("Pinzas de corte", 1),
    ("Pinzas para seguros (anillos)", 1),
    ("Pinzas para abrazaderas", 1),

    # Golpe y corte
    ("Martillo de bola", 2),
    ("Marro de 4 lb", 1),
    ("Mazo de goma", 1),
    ("Juego de botadores y cinceles", 1),
    ("Arco con segueta", 1),
    ("Juego de limas", 1),
    ("Cúter", 2),

    # Herramienta eléctrica y neumática
    ("Pistola de impacto neumática 1/2\"", 1),
    ("Llave de impacto inalámbrica", 1),
    ("Taladro", 1),
    ("Esmeriladora angular", 1),
    ("Compresor de aire", 1),

    # Levante y soporte
    ("Gato hidráulico de patín", 2),
    ("Gato de botella", 1),
    ("Torres de soporte (par)", 2),
    ("Polipasto (garrucha)", 1),

    # Medición y diagnóstico
    ("Multímetro", 1),
    ("Escáner automotriz (OBD2)", 1),
    ("Lámpara de pruebas", 1),
    ("Calibrador vernier", 1),
    ("Juego de lainas (galgas)", 1),
    ("Medidor de presión de llantas", 1),
    ("Manómetro de compresión", 1),

    # Especiales y varios
    ("Extractor de poleas (estrella)", 1),
    ("Extractor de baleros", 1),
    ("Compresor de resortes", 1),
    ("Compresor de anillos de pistón", 1),
    ("Juego de machuelos y tarrajas", 1),
    ("Pistola de engrasar", 1),
    ("Embudo", 2),
    ("Charola para aceite", 2),
    ("Lámpara de trabajo", 2),
    ("Cables pasa corriente", 1),
    ("Imán telescópico", 1),
    ("Espejo de inspección", 1),
    ("Cama para mecánico (rodante)", 1),
]
