package com.prueba.desa.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        // Datos básicos
        config.setJdbcUrl("jdbc:oracle:thin:@localhost:1521:XE");
        config.setUsername("system");
        config.setPassword("admin");
        config.setDriverClassName("oracle.jdbc.OracleDriver");

        // Configuración del pool
        config.setPoolName("HikariNelsonPool");
        config.addDataSourceProperty("v$session.program", "HikariNelsonPool");

        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(30000);
        config.setMaxLifetime(1800000);

        return new HikariDataSource(config);
    }
}
