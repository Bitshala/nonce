import { registerDecorator, ValidationOptions } from 'class-validator';
import { LOCATION_PROBLEM_MESSAGES, locationProblem } from '@nonce/shared';

/**
 * Rejects a location that does not name a city (#45), using the rule shared
 * with the frontend forms. null/undefined are left to @IsOptional.
 */
export function IsCityLocation(
    validationOptions?: ValidationOptions,
): PropertyDecorator {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'IsCityLocation',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate: (value: unknown): boolean =>
                    typeof value !== 'string' ||
                    locationProblem(value) === null,
                defaultMessage: (args): string => {
                    const problem = locationProblem(
                        typeof args?.value === 'string' ? args.value : '',
                    );
                    return LOCATION_PROBLEM_MESSAGES[problem ?? 'blank'];
                },
            },
        });
    };
}
