/**
 * Kategorier og stand til hjemmesiden: træet ligger i @respin/core/taxonomy (delt med admin);
 * her får ikonerne kittets type, så de kan bruges direkte i <Icon>.
 */
import type { IconName } from '@respin/ui';
import * as tax from '@respin/core/taxonomy';

export type CategorySlug = tax.CategorySlug;
export type Condition = tax.Condition;
export interface CategoryGroup extends Omit<tax.CategoryGroup, 'icon'> { icon: IconName }
export interface Category extends Omit<tax.Category, 'icon' | 'groups'> { icon: IconName; groups: readonly CategoryGroup[] }

export const CATEGORIES = tax.CATEGORIES as readonly Category[];
export const groupOf = tax.groupOf as (slug: string, sub: string) => CategoryGroup | undefined;
export const { examplesOf, subsMatching, KIDS_SIZES, CONDITIONS, CONDITION_HELP } = tax;
