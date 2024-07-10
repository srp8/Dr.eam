/* eslint-disable camelcase */
// Resource: https://clerk.com/docs/users/sync-data-to-your-backend
// Above article shows why we need webhooks i.e., to sync data to our backend

// Resource: https://docs.svix.com/receiving/verifying-payloads/why
// It's a good practice to verify webhooks. Above article shows why we should do it
import { Webhook, WebhookRequiredHeaders } from "svix";
import { headers } from "next/headers";

import { IncomingHttpHeaders } from "http";

import type { NextApiRequest, NextApiResponse } from 'next'
import {buffer} from 'micro'
import {
  addMemberToCommunity,
  createCommunity,
  deleteCommunity,
  removeUserFromCommunity,
  updateCommunityInfo,
} from "@/lib/actions/community.actions";
import { WebhookEvent } from "@clerk/nextjs/server";

// Resource: https://clerk.com/docs/integration/webhooks#supported-events
// Above document lists the supported events
type EventType =
  | "organization.created"
  | "organizationInvitation.created"
  | "organizationMembership.created"
  | "organizationMembership.deleted"
  | "organization.updated"
  | "organization.deleted";

type Event = {
  data: Record<string, string | number | Record<string, string>[]>;
  object: "event";
  type: EventType;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse
){
  if(request.method !== 'PUT'){
    return response.status(405).json({message: 'Method not allowed'})
  }

  const WEBHOOK_SECRET = process.env.NEXT_PUBLIC_CLERK_WEBHOOK_SECRET || ""
    
  if(!WEBHOOK_SECRET){
    throw new Error('Please provide a webhook secret')
  }

  const svix_id = request.headers['svix-id'] as string
  const svix_timestamp = request.headers['svix-timestamp'] as string
  const svix_signature = request.headers['svix-signature'] as string

  if(!svix_id || !svix_timestamp || !svix_signature){
    return response.status(400).json({message: 'Missing headers'})
  }

  console.log('headers', request.headers, svix_id, svix_timestamp, svix_signature );
  const body = (await buffer(request)).toString()
  
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt:WebhookEvent

  try{
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  }catch(err){
    console.error('Error verifying webhook', err)
    return response.status(400).json({message: err})
  }

  // Activitate Webhook in the Clerk Dashboard.
  // After adding the endpoint, you'll see the secret on the right side.

  const eventType: any = evt?.type!;

  // Listen organization creation event
  if (eventType === "organization.created") {
    // Resource: https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/CreateOrganization
    // Show what evnt?.data sends from above resource
    //@ts-ignore
    const { id, name, slug, logo_url, image_url, created_by } =
      evt?.data ?? {};

    try {
      // @ts-ignore
      await createCommunity(
        // @ts-ignore
        id,
        name,
        slug,
        logo_url || image_url,
        "org bio",
        created_by
      );

      return response.status(201).json({ message: "User created" });
    } catch (err) {
      console.log(err);
      return response.status(500).json(
        { message: "Internal Server Error" }
      );
    }
  }

  // Listen organization invitation creation event.
  // Just to show. You can avoid this or tell people that we can create a new mongoose action and
  // add pending invites in the database.
  if (eventType === "organizationInvitation.created") {
    try {
      // Resource: https://clerk.com/docs/reference/backend-api/tag/Organization-Invitations#operation/CreateOrganizationInvitation
      console.log("Invitation created", evt?.data);

      return response.status(201).json(
        { message: "Invitation created" }
      );
    } catch (err) {
      console.log(err);

      return response.status(500).json(
        { message: "Internal Server Error" }
      );
    }
  }

  // Listen organization membership (member invite & accepted) creation
  if (eventType === "organizationMembership.created") {
    try {
      // Resource: https://clerk.com/docs/reference/backend-api/tag/Organization-Memberships#operation/CreateOrganizationMembership
      // Show what evnt?.data sends from above resource
      const { organization, public_user_data }:any = evt?.data;
      console.log("created", evt?.data);

      // @ts-ignore
      await addMemberToCommunity(organization.id, public_user_data.user_id);

      return response.status(201).json(
        { message: "Invitation accepted" }
      );
    } catch (err) {
      console.log(err);

      return response.status(505).json(
        { message: "Internal Server Error" }
      );
    }
  }

  // Listen member deletion event
  if (eventType === "organizationMembership.deleted") {
    try {
      // Resource: https://clerk.com/docs/reference/backend-api/tag/Organization-Memberships#operation/DeleteOrganizationMembership
      // Show what evnt?.data sends from above resource
      const { organization, public_user_data }:any = evt?.data;
      console.log("removed", evt?.data);

      // @ts-ignore
      await removeUserFromCommunity(public_user_data.user_id, organization.id);

      return response.status(201).json({ message: "Member removed" });
    } catch (err) {
      console.log(err);

      return response.status(500).json(
        { message: "Internal Server Error" }
      );
    }
  }

  // Listen organization updation event
  if (eventType === "organization.updated") {
    try {
      // Resource: https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/UpdateOrganization
      // Show what evnt?.data sends from above resource
      const { id, logo_url, name, slug }:any = evt?.data;
      console.log("updated", evt?.data);

      // @ts-ignore
      await updateCommunityInfo(id, name, slug, logo_url);

      return response.status(201).json({ message: "Member removed" });
    } catch (err) {
      console.log(err);

      return response.status(500).json(
        { message: "Internal Server Error" }
      );
    }
  }

  // Listen organization deletion event
  if (eventType === "organization.deleted") {
    try {
      // Resource: https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/DeleteOrganization
      // Show what evnt?.data sends from above resource
      const { id } = evt?.data;
      console.log("deleted", evt?.data);

      // @ts-ignore
      await deleteCommunity(id);

      return response.status(201).json(
        { message: "Organization deleted" }
      );
    } catch (err) {
      console.log(err);

      return response.status(500).json(
        { message: "Internal Server Error" }
      );
    }
  }
};
