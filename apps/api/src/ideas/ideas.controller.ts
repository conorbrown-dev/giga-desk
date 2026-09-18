import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { IsString, Length, Matches } from 'class-validator';
import { PrismaService } from '../shared/infrastructure/prisma.service.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authentication.guard.js';
import { RequirePermissions } from '../auth/interfaces/permissions.decorator.js';

class OrganizationInput { @IsString() @Length(1, 120) @Matches(/\S/) declare name: string; }
class IdeaInput { @IsString() @Length(1, 200) @Matches(/\S/) declare title: string; @IsString() @Length(1, 10_000) @Matches(/\S/) declare description: string; }
class CommentInput { @IsString() @Length(1, 10_000) @Matches(/\S/) declare body: string; }
const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex');

@Controller('organizations')
export class IdeasController {
  constructor(private readonly database: PrismaService) {}
  private subject(request: AuthenticatedRequest): string { if (!request.user) throw new ForbiddenException(); return request.user.subject; }
  private async member(organizationId: string, request: AuthenticatedRequest, owner = false) {
    const member = await this.database.organizationMember.findUnique({ where: { organizationId_subject: { organizationId, subject: this.subject(request) } } });
    if (!member || (owner && member.role !== 'Owner')) throw new ForbiddenException('Organization membership does not allow this action'); return member;
  }
  @Get()
  async organizations(@Req() request: AuthenticatedRequest) {
    const subject = this.subject(request);
    return this.database.organization.findMany({ where: { members: { some: { subject } } }, select: { id: true, name: true, members: { where: { subject }, select: { role: true } } }, orderBy: { updatedAt: 'desc' } });
  }
  @Post() @RequirePermissions('organizations:manage')
  async createOrganization(@Body() input: OrganizationInput, @Req() request: AuthenticatedRequest) {
    const subject = this.subject(request); return this.database.organization.create({ data: { name: input.name.trim(), members: { create: { subject, role: 'Owner' } } } });
  }
  @Get(':organizationId/ideas')
  async list(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Req() request: AuthenticatedRequest) { await this.member(organizationId, request); return this.database.idea.findMany({ where: { organizationId }, include: { comments: true }, orderBy: { updatedAt: 'desc' } }); }
  @Post(':organizationId/ideas')
  async create(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Body() input: IdeaInput, @Req() request: AuthenticatedRequest) { const member = await this.member(organizationId, request); return this.database.idea.create({ data: { organizationId, title: input.title.trim(), description: input.description.trim(), createdBy: member.subject } }); }
  @Patch(':organizationId/ideas/:ideaId')
  async update(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('ideaId', ParseUUIDPipe) ideaId: string, @Body() input: IdeaInput, @Req() request: AuthenticatedRequest) { await this.member(organizationId, request); const changed = await this.database.idea.updateMany({ where: { id: ideaId, organizationId, status: 'Open' }, data: { title: input.title.trim(), description: input.description.trim() } }); if (!changed.count) throw new NotFoundException('Open idea not found'); return this.database.idea.findUniqueOrThrow({ where: { id: ideaId } }); }
  @Post(':organizationId/ideas/:ideaId/archive')
  async archive(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('ideaId', ParseUUIDPipe) ideaId: string, @Req() request: AuthenticatedRequest) { await this.member(organizationId, request); const changed = await this.database.idea.updateMany({ where: { id: ideaId, organizationId, status: 'Open' }, data: { status: 'Archived' } }); if (!changed.count) throw new NotFoundException('Open idea not found'); }
  @Post(':organizationId/ideas/:ideaId/comments')
  async comment(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('ideaId', ParseUUIDPipe) ideaId: string, @Body() input: CommentInput, @Req() request: AuthenticatedRequest) { const member = await this.member(organizationId, request); const idea = await this.database.idea.findFirst({ where: { id: ideaId, organizationId, status: 'Open' } }); if (!idea) throw new NotFoundException('Open idea not found'); return this.database.ideaComment.create({ data: { ideaId, body: input.body.trim(), authorId: member.subject } }); }
  @Post(':organizationId/invitations')
  async invite(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Req() request: AuthenticatedRequest) { const member = await this.member(organizationId, request, true); const token = randomBytes(32).toString('base64url'); await this.database.ideaInvitation.create({ data: { organizationId, createdBy: member.subject, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86_400_000) } }); return { token, expiresInDays: 7 }; }
  @Post('invitations/:token/accept')
  async accept(@Param('token') token: string, @Req() request: AuthenticatedRequest) { const subject = this.subject(request); const invitation = await this.database.ideaInvitation.findFirst({ where: { tokenHash: tokenHash(token), acceptedAt: null, expiresAt: { gt: new Date() } } }); if (!invitation) throw new ConflictException('Invite link is invalid, expired, or already used'); await this.database.$transaction([this.database.organizationMember.upsert({ where: { organizationId_subject: { organizationId: invitation.organizationId, subject } }, create: { organizationId: invitation.organizationId, subject, role: 'Coworker' }, update: {} }), this.database.ideaInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date(), acceptedBy: subject } })]); return { organizationId: invitation.organizationId, role: 'Coworker' } }
}
