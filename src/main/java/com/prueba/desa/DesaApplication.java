package com.prueba.desa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
//@EnableConfigurationProperties(ApplicationConfigs.class)
//@ComponentScan(basePackages = {"com.prueba.desa"})
public class DesaApplication {

	public static void main(String[] args) {
		SpringApplication.run(DesaApplication.class, args);
	}

}
