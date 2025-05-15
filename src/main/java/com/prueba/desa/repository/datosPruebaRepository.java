package com.prueba.desa.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.prueba.desa.entidad.datosPrueba;

public interface datosPruebaRepository extends JpaRepository<datosPrueba, String> {
    
    datosPrueba findByCodeTransferencia(String codeTransferencia);
}
