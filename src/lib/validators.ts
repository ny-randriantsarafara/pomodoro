import {
    TASK_MAX_LENGTH,
    TASK_MIN_LENGTH,
    PROJECT_NAME_MAX_LENGTH,
    PROJECT_NAME_MIN_LENGTH,
    GITHUB_LABEL_MAX_LENGTH,
    GITHUB_LABEL_MIN_LENGTH,
} from './constants';

export function validateProjectName(name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length < PROJECT_NAME_MIN_LENGTH) {
        return 'Project name is required';
    }
    if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
        return `Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`;
    }
    return null;
}

export function validateTask(task: string): string | null {
    const trimmed = task.trim();
    if (trimmed.length < TASK_MIN_LENGTH) {
        return 'Task description is required';
    }
    if (trimmed.length > TASK_MAX_LENGTH) {
        return `Task must be at most ${TASK_MAX_LENGTH} characters`;
    }
    return null;
}

export function validateGithubLabel(label: string): string | null {
    const trimmed = label.trim();
    if (trimmed.length < GITHUB_LABEL_MIN_LENGTH) {
        return 'Label is required';
    }
    if (trimmed.length > GITHUB_LABEL_MAX_LENGTH) {
        return `Label must be at most ${GITHUB_LABEL_MAX_LENGTH} characters`;
    }
    return null;
}

export function validateColor(color: string): string | null {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return 'Color must be a valid hex color (e.g. #A0A0FF)';
    }
    return null;
}
