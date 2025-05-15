package com.prueba.desa.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Data;

@Data
@Entity
@Table(name = "ENLINEA")
public class datosPrueba {
    @Id
    @Column(name = "GG_TRANSFERENCIA") // El nombre real en Oracle
    private String codeTransferencia;

    @Column(name = "GP_HORA_PAGO")
    private LocalDate horaPago;

    @Column(name = "GP_ESTADO")
    private String status;


}
