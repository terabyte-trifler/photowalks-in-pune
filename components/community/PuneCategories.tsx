import { categories } from '@/data/photos';
import { padIndex } from '@/lib/utils';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { CategoryButton } from './CategoryButton';

/** The city itself, indexed as subjects. Each one filters the archive above. */
export function PuneCategories() {
  return (
    <section id="categories" className="border-t border-border py-section" aria-labelledby="categories-title">
      <div className="shell">
        <SectionHeader index="07" label="The city" />

        <h2 id="categories-title" className="display mb-[clamp(2rem,4vw,3rem)] max-w-[16ch] text-display-xl">
          Pune, through our cameras.
        </h2>

        <Reveal className="border-t border-foreground">
          <ul>
            {categories.map((category, index) => (
              <li key={category.id}>
                <CategoryButton
                  category={category.id}
                  index={padIndex(index + 1)}
                  label={category.label}
                  note={category.note}
                />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
