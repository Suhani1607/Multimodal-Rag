package com.knowledge.platform.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final Path storageLocation;

    public record StorageResult(
        String absolutePath,
        String relativeStorageKey,
        long sizeBytes,
        String sha256Hash
    ) {}

    public StorageService(@Value("${storage.location:./storage/uploads}") String location) {
        this.storageLocation = Paths.get(location).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
            log.info("Initialized local file storage at: {}", this.storageLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not create storage directory: " + this.storageLocation, e);
        }
    }

    public StorageResult storeFile(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "unnamed_document";
        }

        // Sanitize filename to prevent path traversal
        String cleanName = Paths.get(originalFilename).getFileName().toString();
        String storageKey = UUID.randomUUID() + "_" + cleanName;
        Path targetPath = this.storageLocation.resolve(storageKey);

        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (InputStream is = file.getInputStream();
                 DigestInputStream dis = new DigestInputStream(is, md)) {
                Files.copy(dis, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }
            byte[] digest = md.digest();
            String hash = HexFormat.of().formatHex(digest);
            long size = Files.size(targetPath);

            return new StorageResult(
                targetPath.toAbsolutePath().toString(),
                storageKey,
                size,
                hash
            );
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    public boolean deleteFile(String storageKey) {
        try {
            Path filePath = this.storageLocation.resolve(storageKey).normalize();
            if (Files.exists(filePath)) {
                return Files.deleteIfExists(filePath);
            }
            return false;
        } catch (IOException e) {
            log.error("Failed to delete storage file: {}", storageKey, e);
            return false;
        }
    }

    public Path getStoragePath(String storageKey) {
        return this.storageLocation.resolve(storageKey).normalize();
    }
}
