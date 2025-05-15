package com.prueba.desa.controller;

import com.prueba.desa.entidad.datosPrueba;
import com.prueba.desa.repository.datosPruebaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/conciliacion")
public class datosPruebaController {

    @Autowired
    private datosPruebaRepository repository;
    
    @GetMapping("/orderNo")
    public datosPrueba getPorTransferencia(@RequestParam("codeTransferencia") String transferencia) {
        return repository.findByCodeTransferencia(transferencia);
    }
}
