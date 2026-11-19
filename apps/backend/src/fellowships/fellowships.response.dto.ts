import {
    FellowshipType,
    FellowshipStatus,
    FellowshipKind,
    EducationCategory,
    CohortType,
} from '@/common/enum';
import { Fellowship } from '@/entities/fellowship.entity';
import { GITHUB_URL_RE } from '@/fellowship-applications/proposal-validation';

export class FellowshipResponseDto {
    id!: string;
    type!: FellowshipType;
    kind!: FellowshipKind;
    status!: FellowshipStatus;
    mentorContact!: string | null;
    projectName!: string | null;
    projectGithubLink!: string | null;
    githubProfile!: string | null;
    location!: string | null;
    academicBackground!: string | null;
    graduationYear!: number | null;
    professionalExperience!: string | null;
    domains!: string[] | null;
    codingLanguages!: string[] | null;
    educationInterests!: string[] | null;
    bitcoinContributions!: string | null;
    bitcoinMotivation!: string | null;
    bitcoinOssGoal!: string | null;
    additionalInfo!: string | null;
    questionsForBitshala!: string | null;
    educationCategory!: EducationCategory | null;
    cohortType!: CohortType | null;
    city!: string | null;
    educationCategoryOther!: string | null;
    scopeOfWork!: string | null;
    startDate!: string | null;
    endDate!: string | null;
    amountUsd!: string | null;
    userId!: string;
    userName!: string | null;
    userEmail!: string | null;
    applicationId!: string;
    // The linked application's proposal title. Many fellowships have no
    // onboarding projectName, so clients fall back to this for display.
    proposalTitle!: string | null;
    createdAt!: string;
    updatedAt!: string;

    constructor(obj: FellowshipResponseDto) {
        this.id = obj.id;
        this.type = obj.type;
        this.kind = obj.kind;
        this.status = obj.status;
        this.mentorContact = obj.mentorContact;
        this.projectName = obj.projectName;
        this.projectGithubLink = obj.projectGithubLink;
        this.githubProfile = obj.githubProfile;
        this.location = obj.location;
        this.academicBackground = obj.academicBackground;
        this.graduationYear = obj.graduationYear;
        this.professionalExperience = obj.professionalExperience;
        this.domains = obj.domains;
        this.codingLanguages = obj.codingLanguages;
        this.educationInterests = obj.educationInterests;
        this.bitcoinContributions = obj.bitcoinContributions;
        this.bitcoinMotivation = obj.bitcoinMotivation;
        this.bitcoinOssGoal = obj.bitcoinOssGoal;
        this.additionalInfo = obj.additionalInfo;
        this.questionsForBitshala = obj.questionsForBitshala;
        this.educationCategory = obj.educationCategory;
        this.cohortType = obj.cohortType;
        this.city = obj.city;
        this.educationCategoryOther = obj.educationCategoryOther;
        this.scopeOfWork = obj.scopeOfWork;
        this.startDate = obj.startDate;
        this.endDate = obj.endDate;
        this.amountUsd = obj.amountUsd;
        this.userId = obj.userId;
        this.userName = obj.userName;
        this.userEmail = obj.userEmail;
        this.applicationId = obj.applicationId;
        this.proposalTitle = obj.proposalTitle;
        this.createdAt = obj.createdAt;
        this.updatedAt = obj.updatedAt;
    }

    // The onboarding/proposal fields now live on the linked application; the two
    // profile fields (location, githubProfile) are sourced from the application
    // handle and the fellow's profile respectively.
    static fromEntity(fellowship: Fellowship): FellowshipResponseDto {
        const application = fellowship.application;
        return new FellowshipResponseDto({
            id: fellowship.id,
            type: fellowship.type,
            kind: fellowship.kind,
            status: fellowship.status,
            mentorContact: application.mentorContact,
            projectName: application.projectName,
            projectGithubLink: application.projectGithubLink,
            githubProfile: application.github,
            location: fellowship.user.location,
            academicBackground: application.academicBackground,
            graduationYear: application.graduationYear,
            professionalExperience: application.professionalExperience,
            domains: application.domains,
            codingLanguages: application.codingLanguages,
            educationInterests: application.educationInterests,
            bitcoinContributions: application.bitcoinContributions,
            bitcoinMotivation: application.bitcoinMotivation,
            bitcoinOssGoal: application.bitcoinOssGoal,
            additionalInfo: application.additionalInfo,
            questionsForBitshala: application.questionsForBitshala,
            educationCategory: application.educationCategory,
            cohortType: application.cohortType,
            city: application.city,
            educationCategoryOther: application.educationCategoryOther,
            scopeOfWork: application.scopeOfWork,
            startDate: fellowship.startDate?.toISOString() ?? null,
            endDate: fellowship.endDate?.toISOString() ?? null,
            amountUsd: fellowship.amountUsd,
            userId: fellowship.user.id,
            userName: fellowship.user.displayName,
            userEmail: fellowship.user.email,
            applicationId: application.id,
            proposalTitle: application.title,
            createdAt: fellowship.createdAt.toISOString(),
            updatedAt: fellowship.updatedAt.toISOString(),
        });
    }
}

// The fellow's GitHub handle for the public list. The profile URL is the live
// value -- the application form writes it and the fellow can edit it later from
// their profile -- so it wins; the handle frozen on the application is only the
// fallback for a profile URL that is missing or is not a plain profile link (an
// org repo, a gist, another host). The public githubProfileUrl is rebuilt from
// this one handle, so the two fields can never name different accounts.
function publicGithubUsername(fellowship: Fellowship): string | null {
    const match = fellowship.user.githubProfileUrl?.trim().match(GITHUB_URL_RE);
    if (match) return match[2];
    return fellowship.application.github?.trim() || null;
}

/**
 * A fellow as shown on the public showcase (Bitshala website, newsletter),
 * with member identity and application detail reduced to what a visitor
 * without a login should see.
 *
 * Hand-written projection: Fellowship and FellowshipApplication carry email,
 * location, mentor contact, grant amount and application essay fields, so an
 * Object.assign or a spread would copy those straight through. Naming every
 * field is what keeps them out.
 */
export class PublicFellowResponseDto {
    id!: string;
    displayName!: string;
    githubUsername!: string | null;
    githubProfileUrl!: string | null;
    projectName!: string | null;
    projectGithubLink!: string | null;
    type!: FellowshipType;
    kind!: FellowshipKind;
    startDate!: string;
    endDate!: string;

    constructor(obj: PublicFellowResponseDto) {
        this.id = obj.id;
        this.displayName = obj.displayName;
        this.githubUsername = obj.githubUsername;
        this.githubProfileUrl = obj.githubProfileUrl;
        this.projectName = obj.projectName;
        this.projectGithubLink = obj.projectGithubLink;
        this.type = obj.type;
        this.kind = obj.kind;
        this.startDate = obj.startDate;
        this.endDate = obj.endDate;
    }

    static fromEntity(fellowship: Fellowship): PublicFellowResponseDto {
        const application = fellowship.application;
        const githubUsername = publicGithubUsername(fellowship);
        // listPublicFellows only selects fellowships with both dates set.
        if (!fellowship.startDate || !fellowship.endDate) {
            throw new Error(
                `Fellowship ${fellowship.id} has no contract dates and cannot be listed publicly`,
            );
        }
        return new PublicFellowResponseDto({
            id: fellowship.id,
            displayName: fellowship.user.displayName,
            githubUsername,
            githubProfileUrl: githubUsername
                ? `https://github.com/${githubUsername}`
                : null,
            // Deliberately no fallback to the proposal title: a fellow without
            // a project name is published as null, not under their proposal.
            projectName: application.projectName,
            projectGithubLink: application.projectGithubLink,
            type: fellowship.type,
            kind: fellowship.kind,
            startDate: fellowship.startDate.toISOString(),
            endDate: fellowship.endDate.toISOString(),
        });
    }
}
