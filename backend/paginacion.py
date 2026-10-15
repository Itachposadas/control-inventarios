# backend/paginacion.py
# Paginación de listas: ?pagina=1&por_pagina=20
from flask import request


def _entero(valor, por_defecto, minimo, maximo):
    try:
        return max(minimo, min(maximo, int(valor)))
    except (TypeError, ValueError):
        return por_defecto


def pide_pagina():
    """¿La petición pidió una página? (las pantallas viejas siguen recibiendo la lista completa)"""
    return "pagina" in request.args


def datos_pagina(total, por_defecto=20, maximo=100):
    """Página pedida, tamaño y desde dónde cortar. Devuelve (offset, limite, info)."""
    por_pagina = _entero(request.args.get("por_pagina"), por_defecto, 1, maximo)
    paginas = max(1, -(-total // por_pagina))  # división hacia arriba
    pagina = _entero(request.args.get("pagina"), 1, 1, paginas)
    info = {"total": total, "pagina": pagina, "paginas": paginas, "por_pagina": por_pagina}
    return (pagina - 1) * por_pagina, por_pagina, info


def paginar(query, por_defecto=20, maximo=100):
    """Corta una consulta de SQLAlchemy. Devuelve (registros, info)."""
    total = query.order_by(None).count()
    offset, limite, info = datos_pagina(total, por_defecto, maximo)
    return query.offset(offset).limit(limite).all(), info


def paginar_lista(lista, por_defecto=20, maximo=100):
    """Lo mismo para una lista ya armada en Python. Devuelve (registros, info)."""
    offset, limite, info = datos_pagina(len(lista), por_defecto, maximo)
    return lista[offset:offset + limite], info
