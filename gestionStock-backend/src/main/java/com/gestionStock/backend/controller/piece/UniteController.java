package com.gestionStock.backend.controller.piece;

import com.gestionStock.backend.entity.piece.Unite;
import com.gestionStock.backend.repository.piece.UniteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/unites")
@RequiredArgsConstructor
public class UniteController {

    private final UniteRepository uniteRepository;

    @GetMapping
    public List<Unite> getAll() {
        return uniteRepository.findAll();
    }

    @PostMapping
    public Unite create(@RequestBody Unite unite) {
        return uniteRepository.save(unite);
    }
}
