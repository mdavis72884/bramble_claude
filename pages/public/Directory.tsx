import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, BookOpen, CalendarDays, ArrowRight } from "lucide-react";

interface CoopSummary {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  _count: {
    classes: number;
    events: number;
    users: number;
  };
}

export default function Directory() {
  const [coops, setCoops] = useState<CoopSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/directory/coops")
      .then(res => res.json())
      .then(data => {
        setCoops(data.coops || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredCoops = coops.filter(coop =>
    coop.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-stone-800 to-stone-700 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-serif mb-4" data-testid="text-directory-title">
            Homeschool Co-op Directory
          </h1>
          <p className="text-lg text-stone-300 mb-8">
            Find and join a homeschool co-op in your community
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <Input
              placeholder="Search co-ops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-stone-400"
              data-testid="input-search"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-12 text-stone-400">Loading co-ops...</div>
        ) : filteredCoops.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500 mb-4">No co-ops found</p>
            {search && (
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredCoops.map(coop => (
              <Card key={coop.id} className="hover:shadow-md transition-shadow" data-testid={`card-coop-${coop.id}`}>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">{coop.name}</CardTitle>
                  <CardDescription>{coop.contactEmail}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 mb-4">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {coop._count.users} families
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {coop._count.classes} classes
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {coop._count.events} events
                    </Badge>
                  </div>
                  <Link href={`/coop/${coop.slug}`}>
                    <Button variant="outline" className="w-full" data-testid={`button-view-${coop.id}`}>
                      View Co-op
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-8 border-t border-stone-200">
        <p className="text-stone-500">
          Powered by <span className="font-serif text-stone-700">Bramble</span>
        </p>
      </footer>
    </div>
  );
}
