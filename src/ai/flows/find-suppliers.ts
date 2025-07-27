
'use server';

/**
 * @fileOverview An AI agent for finding nearby agricultural suppliers.
 * This is a simple wrapper around the places service.
 */
import { findNearbyAgriShops } from '@/services/places';
import type { FindSuppliersInput, FindSuppliersOutput } from '@/lib/types';

export async function findSuppliers(input: FindSuppliersInput): Promise<FindSuppliersOutput> {
  const suppliers = await findNearbyAgriShops(input.location);
  return { suppliers };
}
