package com.yf.smp.app.foundation;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class DeployFoundationManifestTest {
    @Test
    void deployFoundationKeepsDockerComposeHelmAndSmokeEntrypoints() throws Exception {
        // TASK-deploy-foundation AC-01 AC-02 AC-03 AC-04 AC-05
        // TASK-backend-foundation AC-05
        Path repoRoot = findRepoRoot();

        assertThat(repoRoot.resolve("backend/Dockerfile")).exists();
        assertThat(repoRoot.resolve("frontend/Dockerfile")).exists();
        assertThat(repoRoot.resolve("deploy/local/docker-compose.yml")).exists();
        assertThat(repoRoot.resolve("deploy/helm/smp-platform/Chart.yaml")).exists();
        assertThat(repoRoot.resolve("deploy/helm/smp-platform/templates/backend-deployment.yaml")).exists();
        assertThat(repoRoot.resolve("deploy/helm/smp-platform/templates/frontend-deployment.yaml")).exists();
        assertThat(repoRoot.resolve("deploy/scripts/smoke.ps1")).exists();

        String compose = Files.readString(repoRoot.resolve("deploy/local/docker-compose.yml"));
        assertThat(compose)
            .contains("postgres:")
            .contains("valkey:")
            .contains("minio:")
            .contains("backend:")
            .contains("frontend:");

        String values = Files.readString(repoRoot.resolve("deploy/helm/smp-platform/values.yaml"));
        assertThat(values)
            .contains("TODO_CONFIRM_REGISTRY")
            .contains("TODO_CONFIRM_POSTGRES_HOST")
            .contains("TODO_CONFIRM_LDAP_URL");
    }

    private Path findRepoRoot() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        try (Stream<Path> candidates = Stream.iterate(current, path -> path.getParent() != null, Path::getParent)) {
            Optional<Path> repoRoot = candidates
                .filter(path -> Files.exists(path.resolve("deploy")) && Files.exists(path.resolve("ai-scaffold.config.json")))
                .findFirst();
            return repoRoot.orElseThrow(() -> new IllegalStateException("Cannot locate repository root"));
        }
    }
}